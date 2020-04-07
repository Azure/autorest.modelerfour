
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

  * getAllParents(schema: Schema) {
    for (const { instance: parent, name } of values(schema.allOf).select(a => this.resolve(a))) {
      yield {
        name: this.interpret.getName(name, schema),
        schema: parent
      }
    }
  }

  checkForHiddenProperties(schemaName: string, schema: Schema, cache = new WeakSet<Schema>()) {
    if (cache.has(schema)) {
      return;
    }
    cache.add(schema);

    if (schema.allOf) {
      const myProperties = this.getProperties(schema);

      for (const { name: parentName, schema: parentSchema } of this.getAllParents(schema)) {
        this.checkForHiddenProperties(parentName, parentSchema, cache);
        for (const [propName, prop] of this.getProperties(parentSchema).entries()) {
          if (myProperties.has(propName)) {
            this.session.error(`Schema '${schemaName}' has a property '${propName}' that is conflicting with a property in the parent schema '${parentName}'`, ['PreCheck', 'PropertyRedeclaration']);
          }
        }
      }
    }
  }

  process() {
    for (const { instance: schema, name, fromRef } of values(this.input.components?.schemas).select(s => this.resolve(s))) {
      this.checkForHiddenProperties(this.interpret.getName(name, schema), schema);
    }
    return this.input;
  }

}