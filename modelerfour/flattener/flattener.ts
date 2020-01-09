import { CodeModel, Schema, ObjectSchema, SchemaType, Property } from '@azure-tools/codemodel';
import { Session } from '@azure-tools/autorest-extension-base';
import { values, items, length, Dictionary, refCount } from '@azure-tools/linq';

function isObjectSchema(schema: Schema): schema is ObjectSchema {
  return schema.type === SchemaType.Object;
}

export class Flattener {
  codeModel: CodeModel
  options: Dictionary<any> = {};
  threshold: number = 2;

  constructor(protected session: Session<CodeModel>) {
    this.codeModel = session.model;// shadow(session.model, filename);
  }

  async init() {
    // get our configuration for this run.
    this.options = await this.session.getValue('modelerfour', {});
    this.threshold = await this.session.getValue('x-ms-payload-flattening-threshold', 9999);

    return this;
  }

  flattenSchema(schema: ObjectSchema) {
    const state = schema.extensions?.['x-ms-flattening'];

    if (state === false) {
      // already done.
      return;
    }

    if (state === true) {
      // in progress.
      throw new Error(`Circular reference encountered during processing of x-ms-client flatten ('${schema.language.default.name}')`);
    }

    // hasn't started yet.
    schema.extensions = schema.extensions || {};
    schema.extensions['x-ms-flattening'] = true;


    if (schema.properties) {
      const removeable = [];

      for (const { key: index, value: property } of items(schema.properties)) {

        if (property.extensions?.['x-ms-client-flatten'] && isObjectSchema(property.schema)) {

          // first, ensure tha the child is pre-flattened
          this.flattenSchema(property.schema);

          // copy all of the properties from the child into this 
          // schema 


          for (const childProperty of values(property.schema.properties)) {
            if (!childProperty) {
              console.error(`what ${property.schema.language.default.name}`);
              continue;
            }
            console.error(`flattening ${property.schema.language.default.name}.${childProperty.language.default.name}`);
            schema.addProperty(new Property(childProperty.language.default.name, childProperty.language.default.description, childProperty.schema, {
              ...(<any>childProperty),
              flattenedNames: [property.serializedName, ...childProperty.flattenedNames ? childProperty.flattenedNames : [childProperty.serializedName]],
              required: property.required && childProperty.required
            }));
          }

          // and then remove this property 
          removeable.push(index);

          // remove the extension
          delete property.extensions['x-ms-client-flatten'];
          if (length(property.extensions) === 0) {
            delete property['extensions'];
          }
          // and mark the child class as 'do-not-generate' ?
          console.error(`Flattened ${property.schema.language.default.name}`);
          (property.schema.extensions = property.schema.extensions || {})['flattened'] = true;
        }
      }

      // remove properties (highest index first)
      for (const each of removeable.sort((a, b) => b - a)) {
        delete schema.properties[each];
      }
    }

    schema.extensions['x-ms-flattening'] = false;
  }

  process() {
    // support 'x-ms-payload-flattening-threshold'  per-operation
    // support '--payload-flattening-threshold:X' global setting

    if (this.options['flatten-models'] !== false) {
      //return this.codeModel;

      for (const schema of values(this.codeModel.schemas.objects)) {
        this.flattenSchema(schema);
      }

      let dirty = false;
      do {
        // reset on every pass
        dirty = false;
        // remove unreferenced models 
        for (const { key, value: schema } of items(this.codeModel.schemas.objects)) {
          if (schema.discriminatorValue || schema.discriminator) {
            // it's polymorphic -- I don't think we can remove this 
            continue;
          }

          if (schema.children?.all || schema.parents?.all) {
            // it's got either a parent or child schema. 
            continue;
          }

          if (refCount(this.codeModel, schema) === 1) {
            delete this.codeModel.schemas.objects?.[key];
            dirty = true;

          }
        }
      } while (dirty);
    }

    if (this.options['flatten-payloads'] !== false) {
      // flatten payloads
    }


    // cleanup 
    for (const schema of values(this.codeModel.schemas.objects)) {
      if (schema.extensions) {
        delete schema.extensions['x-ms-flattening'];
        delete schema.extensions['flattened'];
        if (length(schema.extensions) === 0) {
          delete schema['extensions'];
        }
      }
    }
    return this.codeModel;
  }
}