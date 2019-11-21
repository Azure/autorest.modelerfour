import { CodeModel, Schema, ObjectSchema, SchemaType, Property } from '@azure-tools/codemodel';
import { Session } from '@azure-tools/autorest-extension-base';
import { values, items, length } from '@azure-tools/linq';

function isObjectSchema(schema: Schema): schema is ObjectSchema {
  return schema.type === SchemaType.Object;
}

export class Flattener {
  codeModel: CodeModel

  constructor(protected session: Session<CodeModel>) {
    this.codeModel = session.model;// shadow(session.model, filename);
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
    for (const schema of values(this.codeModel.schemas.objects)) {

      this.flattenSchema(schema);
    }
    for (const schema of values(this.codeModel.schemas.objects)) {
      if (schema.extensions) {
        delete schema.extensions['x-ms-flattening'];
        if (length(schema.extensions) === 0) {
          delete schema['extensions'];
        }
      }
    }
    return this.codeModel;
  }
}