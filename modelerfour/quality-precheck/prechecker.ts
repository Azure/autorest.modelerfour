
import { Session } from '@azure-tools/autorest-extension-base';
import { values, items, length, Dictionary, refCount, clone, keys } from '@azure-tools/linq';
import { Model as oai3, Refable, Dereferenced, dereference, Schema, PropertyDetails, JsonType, StringFormat } from '@azure-tools/openapi';

import { serialize } from '@azure-tools/codegen';
import { Host, startSession } from '@azure-tools/autorest-extension-base';
import { Interpretations } from '../modeler/interpretations';

import { getDiff } from 'recursive-diff'

export async function processRequest(host: Host) {
  const debug = await host.GetValue('debug') || false;

  try {
    const session = await startSession<oai3>(host);

    // process
    const plugin = await new QualityPreChecker(session).init();

    const input = plugin.input;
    // go!
    const result = plugin.process();

    // throw on errors.
    if (!await session.getValue('ignore-errors', false)) {
      session.checkpoint();
    }

    host.WriteFile('prechecked-openapi-document.yaml', serialize(result), undefined, 'prechecked-openapi-document');
    host.WriteFile('original-openapi-document.yaml', serialize(input), undefined, 'openapi-document');
  } catch (E) {
    if (debug) {
      console.error(`${__filename} - FAILURE  ${JSON.stringify(E)} ${E.stack}`);
    }
    throw E;
  }
}

export class QualityPreChecker {
  input: oai3;
  options: Dictionary<any> = {};
  protected interpret: Interpretations;

  constructor(protected session: Session<oai3>) {
    this.input = session.model;// shadow(session.model, filename);

    this.interpret = new Interpretations(session);
  }

  async init() {
    // get our configuration for this run.
    this.options = await this.session.getValue('modelerfour', {});

    return this;
  }

  private resolve<T>(item: Refable<T>): Dereferenced<T> {
    return dereference(this.input, item);
  }


  getProperties(schema: Schema) {
    return items(schema.properties).select(each => ({
      key: each.key,
      name: <string>this.interpret.getPreferredName(each.value, each.key),
      property: this.resolve(each.value).instance
    }));
    //return items(schema.properties).toMap(each => <string>this.interpret.getPreferredName(each.value, each.key), each => this.resolve(each.value).instance);
  }

  getSchemasFromArray(tag: string, schemas: Array<Refable<Schema>> | undefined): Iterable<{ name: string, schema: Schema, tag: string }> {
    return values(schemas).select(a => {
      const { instance: schema, name } = this.resolve(a);
      return {
        name: this.interpret.getName(name, schema),
        schema,
        tag
      }
    });
  }

  * getAllParents(tag: string, schema: Schema): Iterable<{ name: string, schema: Schema, tag: string }> {
    for (const parent of this.getSchemasFromArray(tag, schema.allOf)) {
      yield parent;
      yield* this.getAllParents(parent.name, parent.schema);
    }
  }

  * getGrandParents(tag: string, schema: Schema): Iterable<{ name: string, schema: Schema, tag: string }> {
    for (const parent of this.getSchemasFromArray(tag, schema.allOf)) {
      yield* this.getAllParents(parent.name, parent.schema);
    }
  }

  checkForHiddenProperties(schemaName: string, schema: Schema, completed = new WeakSet<Schema>()) {
    if (completed.has(schema)) {
      return;
    }
    completed.add(schema);


    if (schema.allOf && schema.properties) {

      const myProperties = this.getProperties(schema).toArray();

      for (const { name: parentName, schema: parentSchema } of this.getAllParents(schemaName, schema)) {
        this.checkForHiddenProperties(parentName, parentSchema, completed);

        for (const { key, name: propName, property: parentProp } of this.getProperties(parentSchema)) {
          const myProp = myProperties.find(each => each.name === propName);
          if (myProp) {
            // check if the only thing different is the description.
            const diff = getDiff(parentProp, myProp.property).filter(each => each.path[0] !== 'description' && each.path[0] !== 'x-ms-metadata');

            if (diff.length === 0) {
              // the property didn't change except for description. 
              // we can let this go with a warning.
              this.session.warning(`Schema '${schemaName}' has a property '${propName}' that is already declared the parent schema '${parentName}' but isn't significantly different. The property has been removed from ${schemaName}`, ['PreCheck', 'PropertyRedeclarationWarning']);
              delete schema.properties[myProp.key];
              continue;
            }

            if (diff.length === 1) {
              // special case to yell about readonly changes
              if (diff[0].path[0] === 'readOnly') {
                this.session.warning(`Schema '${schemaName}' has a property '${propName}' that is already declared the parent schema '${parentName}' but 'readonly' has been changed -- this is not permitted. The property has been removed from ${schemaName}`, ['PreCheck', 'PropertyRedeclarationWarning']);
                delete schema.properties[myProp.key];
              }
            }

            if (diff.length > 0) {
              const details = diff.map(each => `${each.path.join('.')} => '${each.op === 'delete' ? '<removed>' : each.val}'`).join(',');
              this.session.error(`Schema '${schemaName}' has a property '${propName}' that is conflicting with a property in the parent schema '${parentName}' differs more than just description : [${details}]`, ['PreCheck', 'PropertyRedeclaration']);
              continue;
            }
          }
        }
      }
    }
  }

  checkForDuplicateParents(schemaName: string, schema: Schema, completed = new WeakSet<Schema>()) {
    if (completed.has(schema)) {
      return;
    }
    completed.add(schema);

    if (schema.allOf) {

      const grandParents = [...this.getGrandParents(schemaName, schema)];
      const direct = [...this.getSchemasFromArray(schemaName, schema.allOf)];

      for (const myParent of direct) {
        for (const duplicate of grandParents.filter(each => each.schema === myParent.schema)) {
          this.session.error(`Schema '${schemaName}' inherits '${duplicate.tag}' via an \`allOf\` that is already coming from parent '${myParent.name}'`, ['PreCheck', 'DuplicateInheritance']);
        }
      }
    }
  }

  isObjectOrEnum(schema: Schema) {
    switch (schema.type) {
      case JsonType.Array:
      case JsonType.Boolean:
      case JsonType.Number:
        return false;

      case JsonType.String:
        return schema.enum || schema['x-ms-enum'];

      case JsonType.Object:
        // empty objects don't worry.
        if (length(schema.properties) === 0 && length(schema.allOf) === 0) {
          return false;
        }
        return true;

      default:
        return (length(schema.properties) > 0 || length(schema.allOf) > 0) ? true : false;
    }

  }

  checkForDuplicateSchemas(): undefined {
    const errors = new Set<string>();
    if (this.input.components && this.input.components.schemas) {
      const dupedNames = items(this.input.components?.schemas).select(s => ({ key: s.key, value: this.resolve(s.value) })).groupBy(each => each.value.instance['x-ms-metadata']?.name, each => each);
      for (const [name, schemas] of dupedNames.entries()) {
        if (name && schemas.length > 1) {


          const diff = getDiff(schemas[0].value.instance, schemas[1].value.instance).filter(each => each.path[0] !== 'description' && each.path[0] !== 'x-ms-metadata');

          if (diff.length === 0) {
            // found two schemas that are indeed the same.
            // stop, find all the $refs to the second one, and rewrite them to go to the first one.
            // then go back and start again.

            delete this.input.components.schemas[schemas[1].key];
            const text = JSON.stringify(this.input);
            this.input = JSON.parse(text.replace(new RegExp(`"\\#\\/components\\/schemas\\/${schemas[1].key}"`, 'g'), `"#/components/schemas/${schemas[0].key}"`));

            // update metadata to match
            if (this.input?.components?.schemas?.[schemas[0].key]) {

              const primarySchema = this.resolve(this.input.components.schemas[schemas[0].key])
              const primaryMetadata = primarySchema.instance['x-ms-metadata'];
              const secondaryMetadata = schemas[1].value.instance['x-ms-metadata'];

              if (primaryMetadata && secondaryMetadata) {
                primaryMetadata.apiVersions = [...new Set<string>([...primaryMetadata.apiVersions || [], ...secondaryMetadata.apiVersions || []])]
                primaryMetadata.filename = [...new Set<string>([...primaryMetadata.filename || [], ...secondaryMetadata.filename || []])]
                primaryMetadata.originalLocations = [...new Set<string>([...primaryMetadata.originalLocations || [], ...secondaryMetadata.originalLocations || []])]
                primaryMetadata['x-ms-secondary-file'] = !(!primaryMetadata['x-ms-secondary-file'] || !secondaryMetadata['x-ms-secondary-file'])
              }
            }
            this.session.verbose(`Schema ${name} has multiple identical declarations, reducing to just one - removing ${schemas[1].key} `, ['PreCheck', 'ReducingSchema']);
            return this.checkForDuplicateSchemas();
          }

          // it may not be identical, but if it's not an object, I'm not sure we care too much.
          if (values(schemas).any(each => this.isObjectOrEnum(each.value.instance))) {
            const rdiff = getDiff(schemas[1].value.instance, schemas[0].value.instance).filter(each => each.path[0] !== 'description' && each.path[0] !== 'x-ms-metadata');
            if (diff.length > 0) {
              const details = diff.map(each => {
                const path = each.path.join('.');
                let iValue = each.op === 'add' ? '<none>' : JSON.stringify(each.oldVal);
                if (each.op !== 'update') {
                  const v = rdiff.find(each => each.path.join('.') === path)
                  iValue = JSON.stringify(v?.val);
                }
                const nValue = each.op === 'delete' ? '<none>' : JSON.stringify(each.val);
                return `${path}: ${iValue} => ${nValue}`;
              }).join(',');
              errors.add(`Duplicate Schema named ${name} -- ${details} `);
              continue;
            }
          }
        }
      }
    }
    for (const each of errors) {
      this.session.error(each, ['PreCheck', 'DuplicateSchema']);
    }
    return undefined;
  }

  fixUpSchemasThatUseAllOfInsteadOfJustRef() {
    const schemas = this.input.components?.schemas;
    if (schemas) {
      for (const { key, instance: schema, name, fromRef } of items(schemas).select(s => ({ key: s.key, ... this.resolve(s.value) }))) {
        // we're looking for schemas that offer no possible value
        // because they just use allOf instead of $ref
        if (!schema.type || schema.type === JsonType.Object) {
          if (length(schema.allOf) === 1) {
            if (length(schema.properties) > 0) {
              continue;
            }
            if (schema.additionalProperties) {
              continue;
            }

            const $ref = schema?.allOf?.[0]?.$ref;
            delete schemas[key];

            const text = JSON.stringify(this.input);
            this.input = JSON.parse(text.replace(new RegExp(`"\\#\\/components\\/schemas\\/${key}"`, 'g'), `"${$ref}"`));
            const location = schema['x-ms-metadata'].originalLocations[0].replace(/^.*\//, '')
            if (schema['x-anonymous-schema']) {
              this.session.warning(`An anonymous inline schema for property '${location.replace(/-/g, '.')}' is using an 'allOf' instead of a $ref. This creates a wasteful anonymous type when generating code. Don't do that. - removing.`, ['PreCheck', 'AllOfWhenYouMeantRef']);
            } else {
              this.session.warning(`Schema '${location}' is using an 'allOf' instead of a $ref. This creates a wasteful anonymous type when generating code. Don't do that. - removing.`, ['PreCheck', 'AllOfWhenYouMeantRef']);
            }

            this.fixUpSchemasThatUseAllOfInsteadOfJustRef()
            return;
          }
        }
      }
    }
  }

  fixUpObjectsWithoutType() {
    this.fixUpSchemasThatUseAllOfInsteadOfJustRef()

    for (const { instance: schema, name, fromRef } of values(this.input.components?.schemas).select(s => this.resolve(s))) {
      if (<any>schema.type === 'file' || <any>schema.format === 'file' || <any>schema.format === 'binary') {
        // handle inconsistency in file format handling.
        this.session.hint(
          `'The schema ${schema?.['x-ms-metadata']?.name || name} with 'type: ${schema.type}', format: ${schema.format}' will be treated as a binary blob for binary media types.`,
          ['PreCheck', 'BinarySchema'], schema);
        schema.type = JsonType.String;
        schema.format = StringFormat.Binary;
      }

      switch (schema.type) {
        case undefined:
        case null:
          if (schema.properties) {
            // if the model has properties, then we're going to assume they meant to say JsonType.object
            // but we're going to warn them anyway.

            this.session.warning(`The schema '${schema?.['x-ms-metadata']?.name || name}' with an undefined type and decalared properties is a bit ambigious. This has been auto-corrected to 'type:object'`, ['PreCheck', 'SchemaMissingType'], schema);
            schema.type = JsonType.Object;
            break;
          }
          if (schema.additionalProperties) {
            // this looks like it's going to be a dictionary
            // we'll mark it as object and let the processObjectSchema sort it out.
            this.session.warning(`The schema '${schema?.['x-ms-metadata']?.name || name}' with an undefined type and additionalProperties is a bit ambigious. This has been auto-corrected to 'type:object'`, ['PreCheck', 'SchemaMissingType'], schema);
            schema.type = JsonType.Object;
            break;
          }

          if (schema.allOf || schema.anyOf || schema.oneOf) {
            // if the model has properties, then we're going to assume they meant to say JsonType.object
            // but we're going to warn them anyway.
            this.session.warning(`The schema '${schema?.['x-ms-metadata']?.name || name}' with an undefined type and 'allOf'/'anyOf'/'oneOf' is a bit ambigious. This has been auto-corrected to 'type:object'`, ['PreCheck', 'SchemaMissingType'], schema);
            schema.type = JsonType.Object;
            break;
          }
          break;
      }
    }
  }


  process() {
    this.fixUpObjectsWithoutType();

    this.checkForDuplicateSchemas();

    let onlyOnce = new WeakSet<Schema>();
    for (const { instance: schema, name, fromRef } of values(this.input.components?.schemas).select(s => this.resolve(s))) {
      this.checkForHiddenProperties(this.interpret.getName(name, schema), schema, onlyOnce);
    }

    onlyOnce = new WeakSet<Schema>();
    for (const { instance: schema, name, fromRef } of values(this.input.components?.schemas).select(s => this.resolve(s))) {
      this.checkForDuplicateParents(this.interpret.getName(name, schema), schema, onlyOnce);
    }


    return this.input;
  }

}