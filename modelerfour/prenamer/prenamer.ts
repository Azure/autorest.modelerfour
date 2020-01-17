import { CodeModel, Parameter, isVirtualParameter, ObjectSchema, isObjectSchema, Property, getAllParentProperties } from '@azure-tools/codemodel';
import { Session } from '@azure-tools/autorest-extension-base';
import { values, length } from '@azure-tools/linq';
import { pascalCase, removeSequentialDuplicates, fixLeadingNumber, deconstruct, selectName, camelCase } from '@azure-tools/codegen';

function getNameOptions(typeName: string, components: Array<string>) {
  const result = new Set<string>();

  // add a variant for each incrementally inclusive parent naming scheme.
  for (let i = 0; i < length(components); i++) {
    const subset = pascalCase([...removeSequentialDuplicates(components.slice(-1 * i, length(components)))]);
    result.add(subset);
  }

  // add a second-to-last-ditch option as <typename>.<name>
  result.add(pascalCase([...removeSequentialDuplicates([...fixLeadingNumber(deconstruct(typeName)), ...deconstruct(components.last)])]));
  return [...result.values()];
}

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

    for (const schema of values(this.codeModel.schemas.objects)) {
      for (const property of values(schema.properties)) {
        property.language.default.originalName = property.language.default.name;
        property.language.default.camelName = camelCase(property.language.default.name);
      }
    }

    // fix collisions from flattening on ObjectSchemas
    this.fixPropertyCollisions();

    // fix collisions from flattening on VirtualParameters
    this.fixParameterCollisions();

    for (const schema of values(this.codeModel.schemas.objects)) {
      for (const property of values(schema.properties)) {
        if (property.language.default.name.toLowerCase() !== property.language.default.camelName.toLowerCase()) {
          property.language.default.name = property.language.default.camelName;
        }
        delete property.language.default.camelName;
      }
    }


    return this.codeModel;
  }
  fixParameterCollisions() {
    for (const operation of values(this.codeModel.operationGroups).selectMany(each => each.operations)) {
      const parameters = values(operation.request.parameters);

      const usedNames = new Set<string>();
      const collisions = new Set<Parameter>();

      // we need to make sure we avoid name collisions. operation parameters get first crack.
      for (const each of values(parameters)) {
        const name = pascalCase(each.language.default.name);
        if (usedNames.has(name)) {
          collisions.add(each);
        } else {
          usedNames.add(name);
        }
      }

      // handle operation parameters
      for (const parameter of collisions) {
        console.error(`Collision : ${parameter.language.default.name}`);
        let options = [parameter.language.default.name];
        if (isVirtualParameter(parameter)) {
          options = getNameOptions(parameter.schema.language.default.name, [parameter.language.default.name, ...parameter.pathToProperty.map(each => each.language.default.name)]);
        }
        parameter.language.default.name = selectName(options, usedNames);
        console.error(`chose : ${parameter.language.default.name}`);
      }
    }

  }

  fixCollisions(schema: ObjectSchema) {
    for (const each of values(schema.parents?.immediate).where(each => isObjectSchema(each))) {
      this.fixCollisions(<ObjectSchema>each);
    }
    const [owned, flattened] = values(schema.properties).bifurcate(each => length(each.flattenedNames) === 0);
    const inherited = [...getAllParentProperties(schema)];

    const all = [...owned, ...inherited, ...flattened];

    const inlined = new Map<string, number>();
    for (const each of all) {
      const name = camelCase(each.language.default.camelName);
      // track number of instances of a given name.
      inlined.set(name, (inlined.get(name) || 0) + 1);
    }

    const usedNames = new Set(inlined.keys());
    for (const each of flattened /*.sort((a, b) => length(a.nameOptions) - length(b.nameOptions)) */) {
      const ct = inlined.get(camelCase(each.language.default.camelName));
      if (ct && ct > 1) {
        // console.error(`Fixing collision on name ${each.name} #${ct} `);
        const options = getNameOptions(each.schema.language.default.camelName, [each.language.default.camelName, ...values(each.flattenedNames)]);
        each.language.default.camelName = camelCase(selectName(options, usedNames));
      }
    }
  }

  fixPropertyCollisions() {
    for (const schema of values(this.codeModel.schemas.objects)) {
      this.fixCollisions(schema);
    }
  }
}
