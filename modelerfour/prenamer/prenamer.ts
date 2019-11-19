import { CodeModel } from '@azure-tools/codemodel';
import { Session } from '@azure-tools/autorest-extension-base';
import { values } from '@azure-tools/linq';

export class PreNamer {
  codeModel: CodeModel
  enum = 0;
  constant = 0;
  constructor(protected session: Session<CodeModel>) {
    this.codeModel = session.model;// shadow(session.model, filename);

  }

  isUnassigned(name: string) {
    return !name || (name.indexOf('·') > -1);
  }

  process() {

    // choice
    for (const schema of values(this.codeModel.schemas.choices)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = `Enum${this.enum++}`;
      }
    }

    // sealed choice
    for (const schema of values(this.codeModel.schemas.sealedChoices)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = `Enum${this.enum++}`;
      }
    }

    // constant
    for (const schema of values(this.codeModel.schemas.constants)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = `Constant${this.enum++}`;
      }
    }

    // strings
    for (const schema of values(this.codeModel.schemas.strings)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = schema.type;
      }
    }

    // number
    for (const schema of values(this.codeModel.schemas.numbers)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = schema.type;
      }
    }

    for (const schema of values(this.codeModel.schemas.dates)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = schema.type;
      }
    }
    for (const schema of values(this.codeModel.schemas.dateTimes)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = schema.type;
      }
    }
    for (const schema of values(this.codeModel.schemas.durations)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = schema.type;
      }
    }
    for (const schema of values(this.codeModel.schemas.uuids)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = schema.type;
      }
    }

    for (const schema of values(this.codeModel.schemas.uris)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = schema.type;
      }
    }

    for (const schema of values(this.codeModel.schemas.unixtimes)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = schema.type;
      }
      if (this.isUnassigned(schema.language.default.description)) {
        schema.language.default.description = 'date in seconds since 1970-01-01T00:00:00Z.';
      }
    }

    for (const schema of values(this.codeModel.schemas.byteArrays)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = schema.type;
      }
    }

    for (const schema of values(this.codeModel.schemas.chars)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = schema.type;
      }
    }

    for (const schema of values(this.codeModel.schemas.booleans)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = schema.type;
      }
    }

    for (const schema of values(this.codeModel.schemas.flags)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = schema.type;
      }
    }

    // dictionary
    for (const schema of values(this.codeModel.schemas.dictionaries)) {
      if (this.isUnassigned(schema.language.default.name)) {
        schema.language.default.name = `DictionaryOf${schema.elementType.language.default.name}`;
      }
      if (this.isUnassigned(schema.language.default.description)) {
        schema.language.default.name = `Dictionary of ${schema.elementType.language.default.name}`;
      }
    }

    for (const schema of values(this.codeModel.schemas.arrays)) {
      if (this.isUnassigned(schema.language.default.name)) {
        if (this.isUnassigned(schema.language.default.name)) {
          schema.language.default.name = `ArrayOf${schema.elementType.language.default.name}`;
        }
        if (this.isUnassigned(schema.language.default.description)) {
          schema.language.default.name = `Array of ${schema.elementType.language.default.name}`;
        }
      }
    }

    return this.codeModel;
  }
}