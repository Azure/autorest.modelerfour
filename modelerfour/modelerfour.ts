import { Model as oai3, Dereferenced, dereference, Refable, includeXDash, JsonType, IntegerFormat, StringFormat, NumberFormat, MediaType } from '@azure-tools/openapi';
import * as OpenAPI from '@azure-tools/openapi';
import { items, values, Dictionary, ToDictionary, length } from '@azure-tools/linq';
import { HttpMethod, HttpModel, CodeModel, Operation, SetType, HttpRequest, BooleanSchema, Schema, NumberSchema, ArraySchema, Parameter, ChoiceSchema, StringSchema, ObjectSchema, ByteArraySchema, CharSchema, DateSchema, DateTimeSchema, DurationSchema, UuidSchema, UriSchema, CredentialSchema, ODataQuerySchema, UnixTimeSchema, SchemaType, OrSchema, AndSchema, XorSchema, DictionarySchema, Request, ParameterLocation, SerializationStyle, ImplementationLocation, Property, ComplexSchema, ObjectSchemaTypes, HttpWithBodyRequest, HttpStreamRequest, HttpParameter, Response, HttpResponse, HttpStreamResponse, SchemaResponse, SealedChoiceSchema } from '@azure-tools/codemodel';
import { Session } from '@azure-tools/autorest-extension-base';
import { Interpretations, XMSEnum } from './interpretations';
import { fail, minimum, pascalCase } from '@azure-tools/codegen';


export class ModelerFour {
  codeModel: CodeModel
  private input: oai3;
  protected interpret: Interpretations;

  constructor(protected session: Session<oai3>) {
    this.input = session.model;// shadow(session.model, filename);

    const i = this.input.info;

    this.codeModel = new CodeModel(i.title || 'MISSING-TITLE', false, {
      info: {
        description: i.description,
        contact: i.contact,
        license: i.license,
        termsOfService: i.termsOfService,
        externalDocs: this.input.externalDocs,
        extensions: Interpretations.getExtensionProperties(i)
      },
      extensions: Interpretations.getExtensionProperties(this.input),
      protocol: {
        http: SetType(HttpModel, {
          servers: []

        })
      }
    });
    this.interpret = new Interpretations(session, this.codeModel);

  }

  private processed = new Map<any, any>();
  private should<T, O>(original: T | undefined, processIt: (orig: T) => O): O | undefined {
    if (original) {
      const result: O = this.processed.get(original) || processIt(original);
      this.processed.set(original, result);
      return result;
    }
    return undefined;
  }

  private resolve<T>(item: Refable<T>): Dereferenced<T> {
    return dereference(this.input, item);
  }

  private use<T, Q = void>(item: Refable<T> | undefined, action: (name: string, instance: T) => Q): Q {
    const i = dereference(this.input, item);
    if (i.instance) {
      return action(i.name, i.instance);
    }
    throw ('Unresolved item.');
  }


  resolveArray<T>(source?: Array<Refable<T>>) {
    return values(source).select(each => dereference(this.input, each).instance);
  }

  resolveDictionary<T>(source?: Dictionary<Refable<T>>) {
    return items(source).linq.select(each => ({
      key: each.key,
      value: dereference(this.input, each.value).instance
    }));
  }

  processBooleanSchema(name: string, schema: OpenAPI.Schema): BooleanSchema {
    return this.codeModel.schemas.add(new BooleanSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-BOOLEAN', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      }
    }));
  }
  processIntegerSchema(name: string, schema: OpenAPI.Schema): NumberSchema {
    return this.codeModel.schemas.add(new NumberSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-INTEGER', schema), SchemaType.Integer, schema.format === IntegerFormat.Int64 ? 64 : 32, {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      },
      maximum: schema.maximum,
      minimum: schema.minimum,
      multipleOf: schema.multipleOf,
      exclusiveMaximum: schema.exclusiveMaximum,
      exclusiveMinimum: schema.exclusiveMinimum
    }));
  }
  processNumberSchema(name: string, schema: OpenAPI.Schema): NumberSchema {
    return this.codeModel.schemas.add(new NumberSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-NUMBER', schema), SchemaType.Number,
      schema.format === NumberFormat.Decimal ? 128 : schema.format == NumberFormat.Double ? 64 : 32, {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      },
      maximum: schema.maximum,
      minimum: schema.minimum,
      multipleOf: schema.multipleOf,
      exclusiveMaximum: schema.exclusiveMaximum,
      exclusiveMinimum: schema.exclusiveMinimum
    }));
  }
  processStringSchema(name: string, schema: OpenAPI.Schema): StringSchema {
    return this.codeModel.schemas.add(new StringSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-STRING', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      },
      maxLength: schema.maxLength ? Number(schema.maxLength) : undefined,
      minLength: schema.minLength ? Number(schema.minLength) : undefined,
      pattern: schema.pattern ? String(schema.pattern) : undefined
    }));
  }
  processCredentialSchema(name: string, schema: OpenAPI.Schema): CredentialSchema {
    return this.codeModel.schemas.add(new CredentialSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-CREDENTIAL', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      },
      maxLength: schema.maxLength ? Number(schema.maxLength) : undefined,
      minLength: schema.minLength ? Number(schema.minLength) : undefined,
      pattern: schema.pattern ? String(schema.pattern) : undefined
    }));
  }
  processUriSchema(name: string, schema: OpenAPI.Schema): UriSchema {
    return this.codeModel.schemas.add(new UriSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-URI', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      },
      maxLength: schema.maxLength ? Number(schema.maxLength) : undefined,
      minLength: schema.minLength ? Number(schema.minLength) : undefined,
      pattern: schema.pattern ? String(schema.pattern) : undefined
    }));
  }
  processUuidSchema(name: string, schema: OpenAPI.Schema): UuidSchema {
    return this.codeModel.schemas.add(new UuidSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-UUID', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      }
    }));
  }
  processDurationSchema(name: string, schema: OpenAPI.Schema): DurationSchema {
    return this.codeModel.schemas.add(new DurationSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-DURATION', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      },
    }));
  }
  processDateTimeSchema(name: string, schema: OpenAPI.Schema): DateTimeSchema {
    return this.codeModel.schemas.add(new DateTimeSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-DATETIME', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      },
      format: schema.format === StringFormat.DateTimeRfc1123 ? StringFormat.DateTimeRfc1123 : StringFormat.DateTime,
    }));
  }
  processDateSchema(name: string, schema: OpenAPI.Schema): DateSchema {
    return this.codeModel.schemas.add(new DateSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-DATE', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      },
    }));
  }
  processCharacterSchema(name: string, schema: OpenAPI.Schema): CharSchema {
    return this.codeModel.schemas.add(new CharSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-CHAR', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      },
    }));
  }
  processByteArraySchema(name: string, schema: OpenAPI.Schema): ByteArraySchema {
    return this.codeModel.schemas.add(new ByteArraySchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-BYTEARRAY', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      },
      format: schema.format === StringFormat.Base64Url ? StringFormat.Base64Url : StringFormat.Byte
    }));
  }
  processArraySchema(name: string, schema: OpenAPI.Schema): ArraySchema {
    const itemSchema = this.resolve(schema.items);
    if (itemSchema.instance === undefined) {
      this.session.error(`Array schema '${name}' is missing schema for items`, ['Modeler', 'MissingArrayElementType'], schema);
      throw Error();
    }
    const elementType = this.processSchema(itemSchema.name || 'array:itemschema', itemSchema.instance);
    return this.codeModel.schemas.add(new ArraySchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-ARRAYSCHEMA', schema), elementType, {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      },
      maxItems: schema.maxItems ? Number(schema.maxItems) : undefined,
      minItems: schema.minItems ? Number(schema.minItems) : undefined,
      uniqueItems: schema.uniqueItems ? true : undefined
    }));
  }


  processChoiceSchema(name: string, schema: OpenAPI.Schema): ChoiceSchema | SealedChoiceSchema {
    const xmse = <XMSEnum>schema['x-ms-enum'];
    name = xmse && xmse.name;
    const sealed = xmse && !(xmse.modelAsString);

    if (sealed) {
      return this.codeModel.schemas.add(new ChoiceSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-CHOICE', schema), {
        extensions: this.interpret.getExtensionProperties(schema),
        summary: schema.title,
        defaultValue: schema.default,
        deprecated: this.interpret.getDeprecation(schema),
        apiVersions: this.interpret.getApiVersions(schema),
        example: this.interpret.getExample(schema),
        externalDocs: this.interpret.getExternalDocs(schema),
        serialization: {
          xml: this.interpret.getXmlSerialization(schema)
        },
        choiceType: new StringSchema('choice', 'choice'),
        choices: this.interpret.getEnumChoices(schema)
      }));
    }

    return this.codeModel.schemas.add(new SealedChoiceSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-CHOICE', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      },
      choiceType: new StringSchema('choice', 'choice'),
      choices: this.interpret.getEnumChoices(schema)
    }));
  }
  processOrSchema(name: string, schema: OpenAPI.Schema): OrSchema {
    throw new Error('Method not implemented.');
  }
  processAndSchema(name: string, schema: OpenAPI.Schema): AndSchema {
    throw new Error('Method not implemented.');
  }
  processXorSchema(name: string, schema: OpenAPI.Schema): XorSchema {
    throw new Error('Method not implemented.');
  }
  processDictionarySchema(name: string, schema: OpenAPI.Schema): DictionarySchema {
    let elementSchema: Schema;
    if (schema.additionalProperties === true) {
      elementSchema = new ObjectSchema('any', 'any');
    } else {
      const eschema = this.resolve(schema.additionalProperties);
      elementSchema = this.processSchema(eschema.name || '', <OpenAPI.Schema>eschema.instance);
    }
    const dict = new DictionarySchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-OBJECTSCHEMA', schema), elementSchema, {
      //extensions: this.interpret.getExtensionProperties(schema),
      //summary: schema.title,
      //defaultValue: schema.default,
      //deprecated: this.interpret.getDeprecation(schema),
      //apiVersions: this.interpret.getApiVersions(schema),
      //example: this.interpret.getExample(schema),
      //externalDocs: this.interpret.getExternalDocs(schema),
      //serialization: {
      //xml: this.interpret.getXmlSerialization(schema)
      //},

    });
    this.codeModel.schemas.add(dict);
    return dict;
  }

  createObjectSchema(name: string, schema: OpenAPI.Schema) {
    const objectSchema = this.codeModel.schemas.add(new ObjectSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-OBJECTSCHEMA', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      },
      minProperties: schema.minProperties ? Number(schema.minProperties) : undefined,
      maxProperties: schema.maxProperties ? Number(schema.maxProperties) : undefined,
    }));

    // cache this now before we accidentally recurse on this type.
    this.processed.set(schema, objectSchema);

    for (const { key: propertyName, value: property } of this.resolveDictionary(schema.properties)) {
      this.use(<OpenAPI.Refable<OpenAPI.Schema>>property, (pSchemaName, pSchema) => {
        const pType = this.processSchema(pSchemaName || `typeFor${propertyName}`, pSchema);
        const prop = objectSchema.addProperty(new Property(this.interpret.getName(propertyName, property), this.interpret.getDescription('PROPERTY-DESCRIPTION-MISSING', property), pType, {
          readOnly: property.readOnly,
          nullable: property.nullable,
          required: schema.required ? schema.required.indexOf(propertyName) > -1 : undefined,
          serializedName: propertyName,
        }));
      });
    }

    return objectSchema;
  }

  processObjectSchema(name: string, aSchema: OpenAPI.Schema): ObjectSchema | DictionarySchema | OrSchema | XorSchema | AndSchema {
    let i = 0;
    const andTypes: Array<ComplexSchema> = <any>values(aSchema.allOf).select(sch => this.use(sch, (n, s) => {
      return this.processSchema(n || `${name}.allOf.${i++}`, s);
    })).toArray();
    const orTypes = values(aSchema.anyOf).select(sch => this.use(sch, (n, s) => {
      return this.processSchema(n || `${name}.anyOf.${i++}`, s);
    })).toArray();
    const xorTypes = values(aSchema.oneOf).select(sch => this.use(sch, (n, s) => {
      return this.processSchema(n || `${name}.oneOf.${i++}`, s);
    })).toArray();

    const dictionaryDef = aSchema.additionalProperties;

    const schema = aSchema;


    // is this more than a straightforward object?
    const isMoreThanObject = (andTypes.length + orTypes.length + xorTypes.length) > 0 || !!dictionaryDef;

    // do we have properties at all?
    const hasProperties = length(schema.properties) > 0;

    if (!isMoreThanObject && !hasProperties) {
      // it's an empty object? 
      this.session.warning(`Schema '${name}' is an empty object without properties or modifiers.`, ['Modeler', 'EmptyObject'], aSchema);
    }
    const objectSchema = hasProperties ? this.createObjectSchema(name, schema) : undefined;

    if (objectSchema) {
      //  return this.codeModel.schemas.add(objectSchema);
    }

    const dictionarySchema = dictionaryDef ? this.processDictionarySchema(name, aSchema) : undefined;

    if (objectSchema) {
      // add it to the upcoming and schema set
      andTypes.unshift(objectSchema);

      // set the apiversion namespace
      const m = minimum(values(objectSchema.apiVersions).select(each => each.version).toArray());
      objectSchema.language.default.namespace = pascalCase(`Api ${m}`);

      // tell it should be internal if possible
      objectSchema.language.default.internal = true;
    }
    if (dictionarySchema) {
      if (andTypes.length === 0 && xorTypes.length === 0 && orTypes.length === 0) {
        return dictionarySchema;
      }
      // otherwise, we're combining
      andTypes.push(dictionarySchema);
    }
    if (xorTypes.length === 0 && orTypes.length === 0) {
      // craft the and type for the model.
      const finalType = new AndSchema(this.interpret.getName(name, schema), schema.description || 'MISSING-SCHEMA-DESCRIPTION-ANDSCHEMA', {
        allOf: andTypes,
        apiVersions: this.interpret.getApiVersions(schema),
      });
      finalType.language.default.namespace = pascalCase(`Api ${minimum(values(finalType.apiVersions).select(each => each.version).toArray())}`);
      return this.codeModel.schemas.add(finalType);
    }
    // const andSchemas = andTypes.map( each => this.processSchema(''| each.) )

    // [<I> and <B>] OR <C>

    throw new Error('Method not implemented.');
  }
  processOdataSchema(name: string, schema: OpenAPI.Schema): ODataQuerySchema {
    throw new Error('Method not implemented.');
  }

  processUnixTimeSchema(name: string, schema: OpenAPI.Schema): UnixTimeSchema {
    return this.codeModel.schemas.add(new UnixTimeSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING-SCHEMA-DESCRIPTION-UNIXTIME', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: {
        xml: this.interpret.getXmlSerialization(schema)
      }
    }));
  }

  trap = new Set();
  processSchema(name: string, schema: OpenAPI.Schema): Schema {


    return this.should(schema, (schema) => {

      //console.error(`Process Schema ${this.interpret.getName(name, schema)}/${schema.description}`);
      if (this.trap.has(schema)) {
        throw new Error('RECURSING!');
      }
      this.trap.add(schema);


      // handle enums differently early
      if (schema.enum || schema['x-ms-enum']) {
        return this.processChoiceSchema(name, schema);
      }

      if (schema.format === 'file') {
        // handle inconsistency in file format handling.
        this.session.warning(
          'The schema type \'file\' is not a OAI standard type. This has been auto-corrected to \'type:string\' and \'format:binary\'',
          ['Modeler', 'TypeFileNotValid'], schema);
        schema.type = OpenAPI.JsonType.String;
        schema.format = StringFormat.Binary;
      }

      // if they haven't set the schema.type then we're going to have to guess what
      // they meant to do.
      switch (schema.type) {
        case undefined:
        case null:
          if (schema.properties) {
            // if the model has properties, then we're going to assume they meant to say JsonType.object 
            // but we're going to warn them anyway.
            this.session.warning(`The schema '${name}' with an undefined type and decalared properties is a bit ambigious. This has been auto-corrected to 'type:object'`, ['Modeler', 'MissingType'], schema);
            schema.type = OpenAPI.JsonType.Object;
            break;
          }

          if (schema.additionalProperties) {
            // this looks like it's going to be a dictionary
            // we'll mark it as object and let the processObjectSchema sort it out.
            this.session.warning(`The schema '${name}' with an undefined type and additionalProperties is a bit ambigious. This has been auto-corrected to 'type:object'`, ['Modeler'], schema);
            schema.type = OpenAPI.JsonType.Object;
            break;
          }

          if (schema.allOf || schema.anyOf || schema.oneOf) {
            // if the model has properties, then we're going to assume they meant to say JsonType.object 
            // but we're going to warn them anyway.
            this.session.warning(`The schema '${name}' with an undefined type and 'allOf'/'anyOf'/'oneOf' is a bit ambigious. This has been auto-corrected to 'type:object'`, ['Modeler', 'MissingType'], schema);
            schema.type = OpenAPI.JsonType.Object;
            break;
          }
      }

      // ok, figure out what kind of schema this is.
      switch (schema.type) {
        case JsonType.Array:
          switch (schema.format) {
            case undefined:
              return this.processArraySchema(name, schema);
            default:
              this.session.error(`Array schema '${name}' with unknown format: '${schema.format}' is not valid`, ['Modeler'], schema);
          }
          break;

        case JsonType.Boolean:
          switch (schema.format) {
            case undefined:
              return this.processBooleanSchema(name, schema);
            default:
              this.session.error(`Boolean schema '${name}' with unknown format: '${schema.format}' is not valid`, ['Modeler'], schema);
          }
          break;

        case JsonType.Integer:
          switch (schema.format) {
            case IntegerFormat.UnixTime:
              return this.processUnixTimeSchema(name, schema);

            case IntegerFormat.Int64:
            case IntegerFormat.Int32:
            case IntegerFormat.None:
            case undefined:
              return this.processIntegerSchema(name, schema);

            default:
              this.session.error(`Integer schema '${name}' with unknown format: '${schema.format}' is not valid`, ['Modeler'], schema);
          }
          break;

        case JsonType.Number:
          switch (schema.format) {
            case undefined:
            case NumberFormat.None:
            case NumberFormat.Double:
            case NumberFormat.Float:
            case NumberFormat.Decimal:
              return this.processNumberSchema(name, schema);

            default:
              this.session.error(`Number schema '${name}' with unknown format: '${schema.format}' is not valid`, ['Modeler'], schema);
          }
          break;

        case JsonType.Object:
          return this.processObjectSchema(name, schema);

        case JsonType.String:
          switch (schema.format) {
            // member should be byte array
            // on wire format should be base64url
            case StringFormat.Base64Url:
            case StringFormat.Byte:
            case StringFormat.Certificate:
              return this.processByteArraySchema(name, schema);

            case StringFormat.Binary:
              // represent as a stream
              // wire format is stream of bytes
              // This is actually a different kind of response or request
              // and should not be treated as a trivial 'type'
              // TODO: 
              break;

            case StringFormat.Char:
              // a single character
              return this.processCharacterSchema(name, schema);

            case StringFormat.Date:
              return this.processDateSchema(name, schema);

            case StringFormat.DateTime:
            case StringFormat.DateTimeRfc1123:
              return this.processDateTimeSchema(name, schema);

            case StringFormat.Duration:
              return this.processDurationSchema(name, schema);

            case StringFormat.Uuid:
              return this.processUuidSchema(name, schema);

            case StringFormat.Url:
              return this.processUriSchema(name, schema);

            case StringFormat.Password:
              return this.processCredentialSchema(name, schema);

            case StringFormat.OData:
              return this.processOdataSchema(name, schema);

            case StringFormat.None:
            case undefined:
            case null:
              return this.processStringSchema(name, schema);

            default:
              this.session.error(`String schema '${name}' with unknown format: '${schema.format}' is not valid`, ['Modeler'], schema);
          }
      }
      this.session.error(`The model ${name} does not have a recognized schema type '${schema.type}'`, ['Modeler', 'UnknownSchemaType']);
      throw new Error(`Unrecognized schema type '${schema.type}'`);
    }) || fail('Unable to process schema.');
  }

  processRequestBody(mediaType: string, request: OpenAPI.RequestBody) {
    /// ?
  }

  processOperation(operation: OpenAPI.HttpOperation | undefined, httpMethod: string, path: string, pathItem: OpenAPI.PathItem) {
    return this.should(operation, (operation) => {
      const { group, member } = this.interpret.getOperationId(httpMethod, path, operation);
      // get group and operation name
      // const opGroup = this.codeModel.

      const opGroup = this.codeModel.getOperationGroup(group);
      const op = opGroup.addOperation(new Operation(member, this.interpret.getDescription('MISSING-OPERATION-DESCRIPTION', operation), {
        extensions: this.interpret.getExtensionProperties(operation)
      }));

      // === Request === 
      const httpRequest = op.request.protocol.http = SetType(HttpRequest, {
        method: httpMethod,
        path: this.interpret.getPath(pathItem, operation, path),
        servers: this.interpret.getServers(operation)
      });

      // get all the parameters for the operation
      this.resolveArray(operation.parameters).select(parameter => {
        this.use(parameter.schema, (name, schema) => {
          const param = op.request.addParameter(new Parameter(parameter.name, this.interpret.getDescription('MISSING-PARAMETER-DESCRIPTION', parameter), this.processSchema(name || '', schema), {
            implementation: 'client' === <any>parameter['x-ms-parameter-location'] ? ImplementationLocation.Client : ImplementationLocation.Method,
            extensions: this.interpret.getExtensionProperties(parameter)
          }));

          param.protocol.http = new HttpParameter(parameter.in);
        });
      }).toArray();

      // what to do about the body?
      const requestBody = this.resolve(operation.requestBody);
      if (requestBody.instance) {
        const contents = items(requestBody.instance.content).toArray();

        switch (contents.length) {
          case 0:
            // no body (ie, GET?)
            // why?
            break;

          case 1: {
            // a single type request body 
            const requestSchema = this.resolve(contents[0].value.schema);
            if (!requestSchema.instance) {
              throw new Error('Missing schema on request.');
            }

            // set the media type to the content type.
            SetType(HttpWithBodyRequest, httpRequest).mediaType = contents[0].key;

            if (this.interpret.isStreamSchema(requestSchema.instance)) {
              // the request body is a stream. 
              SetType(HttpStreamRequest, httpRequest).stream = true;
            } else {
              // it has a body parameter, and we're going to use a schema for it.
              // add it as the last parameter 
              op.request.addParameter(new Parameter(
                'body',
                this.interpret.getDescription('', requestBody.instance),
                this.processSchema(requestSchema.name || 'rqsch', requestSchema.instance), {
                extensions: this.interpret.getExtensionProperties(requestBody.instance),
                protocol: {
                  http: new HttpParameter(ParameterLocation.Body, {
                    style: SerializationStyle.Json,
                    implementation: ImplementationLocation.Client
                  })
                }
              }));
            }
          }
            break;

          default:
            // multipart request body.
            throw new Error('multipart not implemented yet');
        }


      }

      // === Response === 
      for (const { key: responseCode, value: response } of this.resolveDictionary(operation.responses)) {

        for (const { key: mediaType, value: content } of this.resolveDictionary(response.content)) {
          const { name, instance: schema } = this.resolve(content.schema);

          const isErr = responseCode === 'default' || response['x-ms-error-response'];
          if (schema) {
            const s = this.processSchema('xxx', schema);
            const rsp = new SchemaResponse(s, {
              extensions: this.interpret.getExtensionProperties(response)
            });

            const headers = new Array<Schema>();

            for (const { key: header, value: hh } of this.resolveDictionary(response.headers)) {
              this.use(hh.schema, (n, sch) => {
                const hsch = this.processSchema(this.interpret.getName(header, sch), sch);
                hsch.language.default.header = header;
                headers.push(hsch);
              });
            }

            rsp.protocol.http = SetType(HttpResponse, {
              statusCodes: [responseCode],
              mediaTypes: [mediaType],
              headers: headers.length ? headers : undefined,
            });

            if (isErr) {
              op.addException(rsp);
            } else {
              op.addResponse(rsp);
            }
          }
        }
      }
      //op.addResponse()
      //op.addException();
    });
  }

  process() {
    if (this.input.paths) {
      for (const { key: path, value: pathItem } of this.resolveDictionary(this.input.paths).where(each => !this.processed.has(each.value))) {
        this.should(pathItem, (pathItem) => {
          for (const httpMethod of [HttpMethod.Delete, HttpMethod.Get, HttpMethod.Head, HttpMethod.Options, HttpMethod.Patch, HttpMethod.Post, HttpMethod.Put, HttpMethod.Trace]) {
            this.processOperation(pathItem[httpMethod], httpMethod, path, pathItem);
          }
        });
      }
    }
    if (this.input.components) {
      for (const { key: name, value: header } of this.resolveDictionary(this.input.components.headers).where(each => !this.processed.has(each.value))) {
        // this.processed.add(header);
      }

      for (const { key: name, value: request } of this.resolveDictionary(this.input.components.requestBodies).where(each => !this.processed.has(each.value))) {
        // this.processed.add(request);

      }
      for (const { key: name, value: response } of this.resolveDictionary(this.input.components.responses).where(each => !this.processed.has(each.value))) {
        // this.processed.add(response);

      }
      for (const { key: name, value: schema } of this.resolveDictionary(this.input.components.schemas).where(each => !this.processed.has(each.value))) {
        this.processSchema(name, schema);

      }

    }
    return this.codeModel;
  }
}