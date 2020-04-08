
import { Session } from '@azure-tools/autorest-extension-base';
import { values, items, length, Dictionary, refCount, clone } from '@azure-tools/linq';
import { Model as oai3, Refable, Dereferenced, dereference, Schema, PropertyDetails } from '@azure-tools/openapi';

import { serialize } from '@azure-tools/codegen';
import { Host, startSession } from '@azure-tools/autorest-extension-base';
import { Interpretations } from '../modeler/interpretations';

export async function processRequest(host: Host) {
  const debug = await host.GetValue('debug') || false;

  try {
    const session = await startSession<oai3>(host);

    // process
    const plugin = await new QualityPreChecker(session).init();

    // go!
    const result = plugin.process();

    // throw on errors.
    session.checkpoint();

    host.WriteFile('openapi-document.json', serialize(result), undefined, 'openapi-document');
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
    return items(schema.properties).toMap(each => <string>this.interpret.getPreferredName(each.value, each.key), each => this.resolve(each.value).instance);
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

    if (schema.allOf) {
      const myProperties = this.getProperties(schema);
      for (const { name: parentName, schema: parentSchema } of this.getAllParents(schemaName, schema)) {
        this.checkForHiddenProperties(parentName, parentSchema, completed);
        for (const [propName, prop] of this.getProperties(parentSchema).entries()) {
          if (myProperties.has(propName)) {
            this.session.error(`Schema '${schemaName}' has a property '${propName}' that is conflicting with a property in the parent schema '${parentName}'`, ['PreCheck', 'PropertyRedeclaration']);
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

  process() {
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