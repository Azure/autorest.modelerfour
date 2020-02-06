import { CodeModel, Schema, ObjectSchema, isObjectSchema, SchemaType, Property, ParameterLocation, Operation, Parameter, VirtualParameter, getAllProperties, ImplementationLocation, DictionarySchema } from '@azure-tools/codemodel';
import { Session } from '@azure-tools/autorest-extension-base';
import { values, items, length, Dictionary, refCount, clone } from '@azure-tools/linq';

/// isDistinct<T>( Iterableitem:T  )

export class Checker {
  codeModel: CodeModel
  options: Dictionary<any> = {};

  constructor(protected session: Session<CodeModel>) {
    this.codeModel = session.model;// shadow(session.model, filename);
  }

  async init() {
    // get our configuration for this run.
    this.options = await this.session.getValue('modelerfour', {});
    return this;
  }

  checkOperationGroups() {
    for (const dupe of values(this.codeModel.operationGroups).select(each => each.language.default.name).duplicates()) {
      this.session.error(`Duplicate Operation group '${dupe}' detected .`, []);
    };
  }

  checkOperations() {
    for (const group of this.codeModel.operationGroups) {
      for (const dupe of values(group.operations).select(each => each.language.default.name).duplicates()) {
        this.session.error(`Duplicate Operation '${dupe}' detected.`, []);
      };
    }
  }

  checkSchemas() {
    const allSchemas = values(<Dictionary<Schema[]>><any>this.codeModel.schemas).selectMany(schemas => values(schemas)).toArray();

    for (const each of values(allSchemas).where(each => !each.language.default.name)) {
      this.session.warning(`Schema Missing Name '${JSON.stringify(each)}'.`, []);
    }
    /*
        for (const dupe of values(allSchemas).duplicates(schema => ({
          type: schema.type,
          name: schema.language?.default?.name,
        })
        )) {
          this.session.warning(`Duplicate Schema Name '${JSON.stringify(dupe)}' detected.`, []);
        }
    */
    for (const dupe of values(this.codeModel.schemas.objects).select(each => each.language.default.name).duplicates()) {
      this.session.error(`Duplicate Object Schema '${dupe}' detected.`, []);
    };

    /* for (const dupe of values(this.codeModel.schemas.numbers).select(each => each.type).duplicates()) {
      this.session.error(`Duplicate '${dupe}' detected.`, []);
    }; */
  }

  process() {
    if (this.options['additional-checks'] === true) {
      this.checkOperationGroups();

      this.checkOperations();

      this.checkSchemas();

    }
    return this.codeModel;
  }
}