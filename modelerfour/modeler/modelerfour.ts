import { Model as oai3, Dereferenced, dereference, Refable, JsonType, IntegerFormat, StringFormat, NumberFormat, MediaType, filterOutXDash } from '@azure-tools/openapi';
import * as OpenAPI from '@azure-tools/openapi';
import { items, values, Dictionary, length, keys } from '@azure-tools/linq';
import { HttpMethod, HttpModel, CodeModel, Operation, SetType, HttpRequest, BooleanSchema, Schema, NumberSchema, ArraySchema, Parameter, ChoiceSchema, StringSchema, ObjectSchema, ByteArraySchema, CharSchema, DateSchema, DateTimeSchema, DurationSchema, UuidSchema, UriSchema, CredentialSchema, ODataQuerySchema, UnixTimeSchema, SchemaType, OrSchema, XorSchema, DictionarySchema, ParameterLocation, SerializationStyle, ImplementationLocation, Property, ComplexSchema, HttpWithBodyRequest, HttpBinaryRequest, HttpParameter, Response, HttpResponse, HttpBinaryResponse, SchemaResponse, SealedChoiceSchema, ExternalDocumentation, BinaryResponse, BinarySchema, Discriminator, Relations, AnySchema, ConstantSchema, ConstantValue, HttpHeader, ChoiceValue } from '@azure-tools/codemodel';
import { Session } from '@azure-tools/autorest-extension-base';
import { Interpretations, XMSEnum } from './interpretations';
import { fail, minimum, pascalCase, knownMediaType, KnownMediaType } from '@azure-tools/codegen';

export class ModelerFour {
  codeModel: CodeModel
  private input: oai3;
  protected interpret: Interpretations;

  constructor(protected session: Session<oai3>) {
    this.input = session.model;// shadow(session.model, filename);

    const i = this.input.info;

    this.codeModel = new CodeModel(i.title || 'MISSING·TITLE', false, {
      info: {
        description: i.description,
        contact: i.contact,
        license: i.license,
        termsOfService: i.termsOfService,
        externalDocs: filterOutXDash<ExternalDocumentation>(this.input.externalDocs),
        extensions: Interpretations.getExtensionProperties(i)
      },
      extensions: Interpretations.getExtensionProperties(this.input),
      protocol: {
        http: new HttpModel()
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

  location(obj: any): string {
    const locations = obj['x-ms-metadata']?.originalLocations;
    return locations ? `Location:\n   ${locations.join('\n   ')}` : '';
  }

  processBooleanSchema(name: string, schema: OpenAPI.Schema): BooleanSchema {
    return this.codeModel.schemas.add(new BooleanSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-BOOLEAN', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema)
    }));
  }
  processIntegerSchema(name: string, schema: OpenAPI.Schema): NumberSchema {
    return this.codeModel.schemas.add(new NumberSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-INTEGER', schema), SchemaType.Integer, schema.format === IntegerFormat.Int64 ? 64 : 32, {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema),
      maximum: schema.maximum,
      minimum: schema.minimum,
      multipleOf: schema.multipleOf,
      exclusiveMaximum: schema.exclusiveMaximum,
      exclusiveMinimum: schema.exclusiveMinimum
    }));
  }
  processNumberSchema(name: string, schema: OpenAPI.Schema): NumberSchema {
    return this.codeModel.schemas.add(new NumberSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-NUMBER', schema), SchemaType.Number,
      schema.format === NumberFormat.Decimal ? 128 : schema.format == NumberFormat.Double ? 64 : 32, {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema),
      maximum: schema.maximum,
      minimum: schema.minimum,
      multipleOf: schema.multipleOf,
      exclusiveMaximum: schema.exclusiveMaximum,
      exclusiveMinimum: schema.exclusiveMinimum
    }));
  }
  processStringSchema(name: string, schema: OpenAPI.Schema): StringSchema {
    return this.codeModel.schemas.add(new StringSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-STRING', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema),
      maxLength: schema.maxLength ? Number(schema.maxLength) : undefined,
      minLength: schema.minLength ? Number(schema.minLength) : undefined,
      pattern: schema.pattern ? String(schema.pattern) : undefined
    }));
  }
  processCredentialSchema(name: string, schema: OpenAPI.Schema): CredentialSchema {
    return this.codeModel.schemas.add(new CredentialSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-CREDENTIAL', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema),
      maxLength: schema.maxLength ? Number(schema.maxLength) : undefined,
      minLength: schema.minLength ? Number(schema.minLength) : undefined,
      pattern: schema.pattern ? String(schema.pattern) : undefined
    }));
  }
  processUriSchema(name: string, schema: OpenAPI.Schema): UriSchema {
    return this.codeModel.schemas.add(new UriSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-URI', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema),
      maxLength: schema.maxLength ? Number(schema.maxLength) : undefined,
      minLength: schema.minLength ? Number(schema.minLength) : undefined,
      pattern: schema.pattern ? String(schema.pattern) : undefined
    }));
  }
  processUuidSchema(name: string, schema: OpenAPI.Schema): UuidSchema {
    return this.codeModel.schemas.add(new UuidSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-UUID', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema)
    }));
  }
  processDurationSchema(name: string, schema: OpenAPI.Schema): DurationSchema {
    return this.codeModel.schemas.add(new DurationSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-DURATION', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema),
    }));
  }
  processDateTimeSchema(name: string, schema: OpenAPI.Schema): DateTimeSchema {
    return this.codeModel.schemas.add(new DateTimeSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-DATETIME', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema),
      format: schema.format === StringFormat.DateTimeRfc1123 ? StringFormat.DateTimeRfc1123 : StringFormat.DateTime,
    }));
  }
  processDateSchema(name: string, schema: OpenAPI.Schema): DateSchema {
    return this.codeModel.schemas.add(new DateSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-DATE', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema),
    }));
  }
  processCharacterSchema(name: string, schema: OpenAPI.Schema): CharSchema {
    return this.codeModel.schemas.add(new CharSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-CHAR', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema),
    }));
  }
  processByteArraySchema(name: string, schema: OpenAPI.Schema): ByteArraySchema {
    return this.codeModel.schemas.add(new ByteArraySchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-BYTEARRAY', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema),
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
    return this.codeModel.schemas.add(new ArraySchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-ARRAYSCHEMA', schema), elementType, {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema),
      maxItems: schema.maxItems ? Number(schema.maxItems) : undefined,
      minItems: schema.minItems ? Number(schema.minItems) : undefined,
      uniqueItems: schema.uniqueItems ? true : undefined
    }));
  }

  _stringSchema?: StringSchema;
  get stringSchema() {
    return this._stringSchema || (this._stringSchema = this.codeModel.schemas.add(new StringSchema('string', 'simple string')));
  }
  _charSchema?: CharSchema;
  get charSchema() {
    return this._charSchema || (this._charSchema = this.codeModel.schemas.add(new CharSchema('char', 'simple char')));
  }

  _booleanSchema?: BooleanSchema;
  get booleanSchema() {
    return this._booleanSchema || (this._booleanSchema = this.codeModel.schemas.add(new BooleanSchema('bool', 'simple boolean')));
  }

  getSchemaForString(schema: OpenAPI.Schema): Schema {
    switch (schema.format) {
      // member should be byte array
      // on wire format should be base64url
      case StringFormat.Base64Url:
      case StringFormat.Byte:
      case StringFormat.Certificate:
        return this.processByteArraySchema('', schema);

      case StringFormat.Char:
        return this.charSchema;

      case StringFormat.Date:
        return this.processDateSchema('', schema);

      case StringFormat.DateTime:
      case StringFormat.DateTimeRfc1123:
        return this.processDateTimeSchema('', schema);

      case StringFormat.Duration:
        return this.processDurationSchema('', schema);

      case StringFormat.Uuid:
        return this.processUuidSchema('', schema);

      case StringFormat.Url:
        return this.processUriSchema('', schema);

      case StringFormat.Password:
        return this.stringSchema;

      case StringFormat.OData:
        return this.processOdataSchema('', schema);

      default:
        return this.stringSchema;
    }
  }

  getPrimitiveSchemaForEnum(schema: OpenAPI.Schema) {
    switch (schema.type) {
      case JsonType.String:
        return this.getSchemaForString(schema);
      case JsonType.Boolean:
        return this.booleanSchema;
      case JsonType.Number:
      case JsonType.Integer:
        return this.processNumberSchema('number', schema);
    }
    throw Error('Uh oh.');
  }

  processChoiceSchema(name: string, schema: OpenAPI.Schema): ChoiceSchema | SealedChoiceSchema | ConstantSchema {
    const xmse = <XMSEnum>schema['x-ms-enum'];
    name = (xmse && xmse.name) || this.interpret.getName(name, schema);
    const sealed = xmse && !(xmse.modelAsString);

    if (length(schema.enum) === 1 || length(xmse?.values) === 1) {
      return this.codeModel.schemas.add(new ConstantSchema(name, this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-CHOICE', schema), {
        extensions: this.interpret.getExtensionProperties(schema),
        summary: schema.title,
        defaultValue: schema.default,
        deprecated: this.interpret.getDeprecation(schema),
        apiVersions: this.interpret.getApiVersions(schema),
        example: this.interpret.getExample(schema),
        externalDocs: this.interpret.getExternalDocs(schema),
        serialization: this.interpret.getSerialization(schema),
        valueType: this.getPrimitiveSchemaForEnum(schema),
        value: new ConstantValue(this.interpret.getConstantValue(schema, length(xmse?.values) === 1 ? xmse?.values?.[0]?.value : schema?.enum?.[0]))
      }));
    }

    if (!sealed) {
      return this.codeModel.schemas.add(new ChoiceSchema(name, this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-CHOICE', schema), {
        extensions: this.interpret.getExtensionProperties(schema),
        summary: schema.title,
        defaultValue: schema.default,
        deprecated: this.interpret.getDeprecation(schema),
        apiVersions: this.interpret.getApiVersions(schema),
        example: this.interpret.getExample(schema),
        externalDocs: this.interpret.getExternalDocs(schema),
        serialization: this.interpret.getSerialization(schema),
        choiceType: <any>this.getPrimitiveSchemaForEnum(schema),
        choices: this.interpret.getEnumChoices(schema)
      }));
    }

    return this.codeModel.schemas.add(new SealedChoiceSchema(name, this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-CHOICE', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema),
      choiceType: <any>this.getPrimitiveSchemaForEnum(schema),
      choices: this.interpret.getEnumChoices(schema)
    }));
  }
  processOrSchema(name: string, schema: OpenAPI.Schema): OrSchema {
    throw new Error('Method not implemented.');
  }
  processXorSchema(name: string, schema: OpenAPI.Schema): XorSchema {
    throw new Error('Method not implemented.');
  }
  processDictionarySchema(name: string, schema: OpenAPI.Schema): DictionarySchema {
    let elementSchema: Schema;
    if (schema.additionalProperties === true) {
      elementSchema = new AnySchema('<Any object>');
    } else {
      const eschema = this.resolve(schema.additionalProperties);
      const ei = eschema.instance;
      if (ei && this.interpret.isEmptyObject(ei)) {
        elementSchema = new AnySchema(this.interpret.getDescription('<Any object>', ei));
      } else {
        elementSchema = this.processSchema(eschema.name || '', <OpenAPI.Schema>eschema.instance);
      }
    }
    const dict = new DictionarySchema(this.interpret.getName(name, schema), this.interpret.getDescription(`Dictionary of <${elementSchema.language.default.name}>`, schema), elementSchema, {


    });
    this.codeModel.schemas.add(dict);
    return dict;
  }

  isSchemaPolymorphic(schema: OpenAPI.Schema | undefined): boolean {
    if (schema) {
      if (schema.type === JsonType.Object) {
        if (schema.discriminator) {
          return true;
        }
        return this.resolveArray(schema.allOf).any(each => this.isSchemaPolymorphic(each));
      }
    }
    return false;
  }

  createObjectSchema(name: string, schema: OpenAPI.Schema) {
    const discriminatorProperty = schema?.discriminator?.propertyName ? schema.discriminator.propertyName : undefined;

    const objectSchema = this.codeModel.schemas.add(new ObjectSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-OBJECTSCHEMA', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema),
      minProperties: schema.minProperties ? Number(schema.minProperties) : undefined,
      maxProperties: schema.maxProperties ? Number(schema.maxProperties) : undefined,
    }));

    // cache this now before we accidentally recurse on this type.
    this.processed.set(schema, objectSchema);
    for (const { key: propertyName, value: propertyDeclaration } of items(schema.properties)) {
      const property = this.resolve(propertyDeclaration);
      this.use(<OpenAPI.Refable<OpenAPI.Schema>>propertyDeclaration, (pSchemaName, pSchema) => {
        const pType = this.processSchema(pSchemaName || `typeFor${propertyName}`, pSchema);
        const prop = objectSchema.addProperty(new Property(this.interpret.getPreferredName(propertyDeclaration, propertyName), this.interpret.getDescription(pType.language.default.description, property), pType, {
          readOnly:  .readOnly,
          nullable: propertyDeclaration.nullable,
          required: schema.required ? schema.required.indexOf(propertyName) > -1 : undefined,
          serializedName: propertyName,
          isDiscriminator: discriminatorProperty === propertyName ? true : undefined,
          extensions: this.interpret.getExtensionProperties(property),
        }));
        if (prop.isDiscriminator) {
          objectSchema.discriminator = new Discriminator(prop);
        }
      });
    }

    return objectSchema;
  }

  processObjectSchema(name: string, aSchema: OpenAPI.Schema): ObjectSchema | DictionarySchema | OrSchema | XorSchema {
    let i = 0;
    const parents: Array<ComplexSchema> = <any>values(aSchema.allOf).select(sch => this.use(sch, (n, s) => {
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
    const isMoreThanObject = (parents.length + orTypes.length + xorTypes.length) > 0 || !!dictionaryDef;

    // do we have properties at all?
    const hasProperties = length(schema.properties) > 0;

    if (!isMoreThanObject && !hasProperties) {
      // it's an empty object? 
      this.session.warning(`Schema '${name}' is an empty object without properties or modifiers.`, ['Modeler', 'EmptyObject'], aSchema);
    }

    const dictionarySchema = dictionaryDef ? this.processDictionarySchema(name, aSchema) : undefined;
    if (parents.length === 0 && !hasProperties && dictionarySchema) {
      return dictionarySchema;
    }

    const objectSchema = this.createObjectSchema(name, schema);

    // add it to the upcoming and schema set
    // andTypes.unshift(objectSchema);

    // set the apiversion namespace
    const m = minimum(values(objectSchema.apiVersions).select(each => each.version).toArray());
    objectSchema.language.default.namespace = pascalCase(`Api ${m}`, false);

    // tell it should be internal if possible
    // objectSchema.language.default.internal = true;

    if (dictionarySchema) {
      if (!hasProperties && parents.length === 0 && xorTypes.length === 0 && orTypes.length === 0) {
        return dictionarySchema;
      }
      // otherwise, we're combining
      parents.push(dictionarySchema);
    }

    if (parents.length > 0 && xorTypes.length === 0 && orTypes.length === 0) {
      // craft the and type for the model.
      const n = this.interpret.getName(name, schema);
      const isPolymorphic = this.isSchemaPolymorphic(schema);
      objectSchema.discriminatorValue = isPolymorphic ? schema['x-ms-discriminator-value'] || n : undefined;

      objectSchema.parents = new Relations();
      objectSchema.parents.immediate = parents;

      for (const p of parents) {
        if (p.type === SchemaType.Object) {
          const parent = (<ObjectSchema>p);
          const grandparents = parent.parents?.all || [];
          const allParents = [...parents, ...grandparents];

          objectSchema.parents.all.push(...allParents);
          parent.children = parent.children || new Relations();
          parent.children.immediate.push(objectSchema);
          parent.children.all.push(objectSchema);


          for (const pp of grandparents) {
            if (pp.type === SchemaType.Object) {
              const pparent = (<ObjectSchema>pp);
              pparent.children = pparent.children || new Relations();
              pparent.children.all.push(objectSchema);
              if (pparent.discriminator && objectSchema.discriminatorValue) {
                pparent.discriminator.all[objectSchema.discriminatorValue] = objectSchema;
                // make sure parent has a discriminator, because grandparent does.
                parent.discriminator = parent.discriminator || new Discriminator(pparent.discriminator.property);
              }
            }
          }

          if (parent.discriminator && objectSchema.discriminatorValue) {
            parent.discriminator.immediate[objectSchema.discriminatorValue] = objectSchema;
            parent.discriminator.all[objectSchema.discriminatorValue] = objectSchema;
          }
        } else {
          objectSchema.parents.all.push(p);
        }
      }
    }
    return objectSchema;
  }
  processOdataSchema(name: string, schema: OpenAPI.Schema): ODataQuerySchema {
    throw new Error('Method not implemented.');
  }

  processUnixTimeSchema(name: string, schema: OpenAPI.Schema): UnixTimeSchema {
    return this.codeModel.schemas.add(new UnixTimeSchema(this.interpret.getName(name, schema), this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-UNIXTIME', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      defaultValue: schema.default,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
      serialization: this.interpret.getSerialization(schema)
    }));
  }

  processBinarySchema(name: string, schema: OpenAPI.Schema): BinarySchema {
    return this.codeModel.schemas.add(new BinarySchema(this.interpret.getDescription('MISSING·SCHEMA-DESCRIPTION-BINARY', schema), {
      extensions: this.interpret.getExtensionProperties(schema),
      summary: schema.title,
      deprecated: this.interpret.getDeprecation(schema),
      apiVersions: this.interpret.getApiVersions(schema),
      example: this.interpret.getExample(schema),
      externalDocs: this.interpret.getExternalDocs(schema),
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

      if (<any>schema.type === 'file') {
        // handle inconsistency in file format handling.
        this.session.warning(
          'The schema type \'file\' is not a OAI standard type. This has been auto-corrected to \'type:string\' and \'format:binary\'',
          ['Modeler', 'TypeFileNotValid'], schema);
        schema.type = OpenAPI.JsonType.String;
        schema.format = StringFormat.Binary;
      }

      if (<any>schema.format === 'file') {
        // handle inconsistency in file format handling.
        this.session.warning(
          'The schema format  \'file\' is not a OAI standard type. This has been auto-corrected to \'type:string\' and \'format:binary\'',
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

          {
            // no type info at all!? 
            // const err = `The schema '${name}' has no type or format information whatsoever. ${this.location(schema)}`;
            this.session.warning(`The schema '${name}' has no type or format information whatsoever. ${this.location(schema)}`, ['Modeler', 'MissingType'], schema);
            // throw Error(err);
            return new AnySchema('<Any object>');
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
          schema.format = schema.format ? schema.format.toLowerCase() : schema.format;
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
              // represent as a binary
              // wire format is stream of bytes
              // This is actually a different kind of response or request
              // and should not be treated as a trivial 'type'
              return this.processBinarySchema(name, schema);

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
              // console.error(`String schema '${name}' with unknown format: '${schema.format}' is treated as simple string.`);
              return this.processStringSchema(name, schema);

            //              this.session.error(`String schema '${name}' with unknown format: '${schema.format}' is not valid`, ['Modeler'], schema);
          }
      }
      this.session.error(`The model ${name} does not have a recognized schema type '${schema.type}' ${JSON.stringify(schema)} `, ['Modeler', 'UnknownSchemaType']);
      throw new Error(`Unrecognized schema type:'${schema.type}' / format: ${schema.format} ${JSON.stringify(schema)} `);
    }) || fail('Unable to process schema.');
  }

  processRequestBody(mediaType: string, request: OpenAPI.RequestBody) {
    /// ?
  }

  filterMediaTypes(mm: Dictionary<MediaType> | undefined) {
    const mediaTypeGroups = items(mm).groupBy(
      each => knownMediaType(each.key),
      each => ({
        mediaType: each.key,
        schema: this.resolve(each.value.schema),
      }));

    // filter out invalid combinations
    //if (length(mediaTypeGroups.keys()) > 0) {
    // because the oai2-to-oai3 conversion doesn't have good logic to know
    // which produces type maps to each operation response,
    // we have to go thru the possible combinations 
    // and eliminate ones that don't make sense.
    // (ie, a binary media type should have a binary response type, a json or xml media type should have a <not binary> type ).
    for (const [knownMediaType, mt] of [...mediaTypeGroups.entries()]) {
      for (const fmt of mt) {
        switch (knownMediaType) {
          case KnownMediaType.Json:
          case KnownMediaType.Xml:
          case KnownMediaType.Form:
            if (this.interpret.isBinarySchema(fmt.schema.instance)) {
              // bad combo, remove.
              mediaTypeGroups.delete(knownMediaType);
              continue;
            }
            break;
          case KnownMediaType.Binary:
          case KnownMediaType.Text:
            if (!this.interpret.isBinarySchema(fmt.schema.instance)) {
              // bad combo, remove.
              mediaTypeGroups.delete(knownMediaType);
              continue;
            }
            break;

          default:
            throw new Error(`Not able to process media type ${fmt.mediaType} at this moment.`);
        }
      }
    }
    // }
    return mediaTypeGroups;
  }

  processOperation(operation: OpenAPI.HttpOperation | undefined, httpMethod: string, path: string, pathItem: OpenAPI.PathItem) {
    return this.should(operation, (operation) => {
      path = this.interpret.getPath(pathItem, operation, path);
      const p = path.indexOf('?');
      path = p > -1 ? path.substr(0, p) : path;

      let baseUri = '';

      const { group, member } = this.interpret.getOperationId(httpMethod, path, operation);
      // get group and operation name
      // const opGroup = this.codeModel.

      const opGroup = this.codeModel.getOperationGroup(group);
      const op = opGroup.addOperation(new Operation(member, this.interpret.getDescription('MISSING·OPERATION-DESCRIPTION', operation), {
        extensions: this.interpret.getExtensionProperties(operation),
        apiVersions: this.interpret.getApiVersions(pathItem)
      }));

      // create $host parameters from servers information.
      // $host is comprised of []
      const servers = values(operation.servers).toArray();

      switch (servers.length) {
        case 0:
          // Yanni says "we're ignoring the swagger spec because it is stupid."
          servers.push({
            url: '',
            variables: {},
            description: 'Service Host URL.'
          });

        // eslint-disable-next-line no-fallthrough
        case 1: {
          const server = servers[0];
          // trim extraneous slash .
          const uri = server.url.endsWith('/') && path.startsWith('/') ? server.url.substr(0, server.url.length - 1) : server.url;

          if (length(server.variables) === 0) {
            // scenario 1 : single static value

            // check if we have the $host parameter foor this uri yet.
            op.request.addParameter(this.codeModel.addGlobalParameter(each => each.language.default.name === '$host' && each.clientDefaultValue === uri, () => new Parameter('$host', 'server parameter', this.stringSchema, {
              required: true,
              implementation: ImplementationLocation.Client,
              protocol: {
                http: new HttpParameter(ParameterLocation.Uri)
              },
              clientDefaultValue: uri,
              language: {
                default: {
                  serializedName: '$host'
                }
              }
            })));
            // and update the path for the operation.
            baseUri = '{$host}';
          } else {
            // scenario 3 : single parameterized value

            for (const { key: variableName, value: variable } of items(server.variables).where(each => !!each.key)) {
              const sch = variable.enum ? this.processChoiceSchema(variableName, <OpenAPI.Schema>{ type: 'string', enum: variable.enum, description: variable.description || `${variableName} - server parameter` }) : this.stringSchema;

              const clientdefault = variable.default ? variable.default : undefined;

              // figure out where the parameter is supposed to be.
              const implementation = variable['x-ms-parameter-location'] === 'client' ? ImplementationLocation.Client : ImplementationLocation.Method;

              let p = implementation === ImplementationLocation.Client ? this.codeModel.findGlobalParameter(each => each.language.default.name === variableName && each.clientDefaultValue === clientdefault) : undefined;


              const originalParameter = this.resolve<OpenAPI.Parameter>(variable['x-ms-original']);


              if (!p) {
                p = new Parameter(variableName, variable.description || `${variableName} - server parameter`, sch, {
                  required: true,
                  implementation,
                  protocol: {
                    http: new HttpParameter(ParameterLocation.Uri)
                  },
                  language: {
                    default: {
                      serializedName: variableName
                    }
                  },
                  extensions: { ...this.interpret.getExtensionProperties(variable), 'x-ms-priority': originalParameter?.instance?.['x-ms-priority'] },
                  clientDefaultValue: clientdefault
                });
                if (implementation === ImplementationLocation.Client) {
                  // add it to the global parameter list (if it's a client parameter)
                  this.codeModel.addGlobalParameter(p);
                }
              }
              // add the parameter to the operaiton
              op.request.addParameter(p);
            }
            // and update the path for the operation. (copy the template onto the path)
            // path = `${uri}${path}`;
            baseUri = uri;
          }
        }
          break;

        default: {
          if (values(servers).any(each => length(each.variables) > 0)) {
            // scenario 4 : multiple parameterized value - not valid.
            throw new Error(`Operation ${pathItem?.['x-ms-metadata']?.path} has multiple server information with parameterized values.`);
          }
          const sss = servers.join(',');
          let choiceSchema =
            this.codeModel.schemas.choices?.find(each => each.choices.map(choice => choice.value).join(',') === sss) ||
            this.codeModel.schemas.add(new ChoiceSchema('host-options', 'choices for server host', {
              choices: servers.map(each => new ChoiceValue(each.url, `host: ${each.url}`, each.url))
            }));

          // scenario 2 : multiple static value
          op.request.addParameter(this.codeModel.addGlobalParameter(each => each.language.default.name === '$host' && each.clientDefaultValue === servers[0].url, () =>
            new Parameter('$host', 'server parameter', choiceSchema, {
              required: true,
              implementation: ImplementationLocation.Client,
              protocol: {
                http: new HttpParameter(ParameterLocation.Uri)
              },
              language: {
                default: {
                  serializedName: '$host'
                }
              },
              clientDefaultValue: servers[0].url
            })))

          // update the path to have a $host parameter.
          //path = `{$host}${path}`;
          baseUri = '{$host}';

        }
      }


      // === Request === 
      const httpRequest = op.request.protocol.http = SetType(HttpRequest, {
        method: httpMethod,
        path: path, // this.interpret.getPath(pathItem, operation, path),
        uri: baseUri
      });

      // get all the parameters for the operation
      values(operation.parameters).select(each => dereference(this.input, each)).select(pp => {
        const parameter = pp.instance;
        this.use(parameter.schema, (name, schema) => {

          if (this.interpret.isApiVersionParameter(parameter)) {
            // use the API versions information for this operation to give the values that should be used 
            // notes: 
            // legal values for apiversion parameter, are the x-ms-metadata.apiversions values

            // if there is a single apiversion value, you'll see a constant parameter.

            // if there are multiple apiversion values, 
            //  - and profile are provided, you'll get a sealed conditional parameter that has values dependent upon choosing a profile.
            //  - otherwise, you'll get a sealed choice parameter.


            const apiversions = this.interpret.getApiVersionValues(pathItem);
            if (apiversions.length === 0) {
              // !!! 
              throw new Error(`Operation ${pathItem?.['x-ms-metadata']?.path} has no apiversions but has an apiversion parameter.`);
            }
            if (apiversions.length === 1) {
              const apiVersionConst = this.codeModel.schemas.add(new ConstantSchema(`ApiVersion-${apiversions[0]}`, `Api Version (${apiversions[0]})`, {
                valueType: this.stringSchema,
                value: new ConstantValue(apiversions[0])
              }));

              return op.request.addParameter(new Parameter('ApiVersion', 'Api Version', apiVersionConst, {
                required: parameter.required ? true : undefined,
                //implementation: 'client' === <any>parameter['x-ms-parameter-location'] ? ImplementationLocation.Client : ImplementationLocation.Method,
                implementation: ImplementationLocation.Client,
                protocol: {
                  http: new HttpParameter(ParameterLocation.Query)
                },
                language: {
                  default: {
                    serializedName: parameter.name
                  }
                }
              }));
            }

            // multiple api versions. okaledokaley
            throw new Error('MultiApiVersion Not Ready Yet');

          } else {
            // Not an APIVersion Parameter
            const implementation = pp.fromRef ?
              'method' === <any>parameter['x-ms-parameter-location'] ? ImplementationLocation.Method : ImplementationLocation.Client :
              'client' === <any>parameter['x-ms-parameter-location'] ? ImplementationLocation.Client : ImplementationLocation.Method;

            if (implementation === ImplementationLocation.Client) {
              // check to see of it's already in the global parameters
              const p = this.codeModel.findGlobalParameter(each => each.language.default.name === parameter.name);
              if (p) {
                return op.request.addParameter(p);
              }
            }

            const newParam = op.request.addParameter(new Parameter(parameter.name, this.interpret.getDescription('MISSING·PARAMETER-DESCRIPTION', parameter), this.processSchema(name || '', schema), {
              required: parameter.required ? true : undefined,
              implementation,
              extensions: this.interpret.getExtensionProperties(parameter),
              protocol: {
                http: new HttpParameter(parameter.in, parameter.style ? {
                  style: <SerializationStyle><unknown>parameter.style,
                } : undefined),
              },
              language: {
                default: {
                  serializedName: parameter.name
                }
              }
            }));

            if (implementation === ImplementationLocation.Client) {
              this.codeModel.addGlobalParameter(newParam);
            }

            return newParam;
          }
        });
      }).toArray();

      // what to do about the body?
      const requestBody = this.resolve(operation.requestBody);
      if (requestBody.instance) {
        const mediaTypeGroups = this.filterMediaTypes(requestBody.instance.content);


        switch (length(mediaTypeGroups.keys())) {
          case 0:
            // no request body (ie, GET?)
            break;

          case 1: {
            // a single type request body 
            const mediaTypes = values(mediaTypeGroups).first();
            const kmt = keys(mediaTypeGroups).first() || KnownMediaType.Unknown;

            const mediaType = values(mediaTypes).first();
            if (!mediaType) {
              throw new Error('??.');
            }

            const requestSchema = mediaType.schema;
            if (!requestSchema.instance) {
              throw new Error('Missing schema on request.');
            }

            // set the media type to the content type.
            const httpReq = SetType(HttpWithBodyRequest, httpRequest);

            httpReq.knownMediaType = kmt;
            httpReq.mediaTypes = values(mediaTypes).select(each => each.mediaType).toArray();

            if (this.interpret.isBinarySchema(requestSchema.instance)) {
              // the request body is a stream. 
              SetType(HttpBinaryRequest, httpRequest).binary = true;
              op.request.addParameter(new Parameter(
                requestBody.instance?.['x-ms-requestBody-name'] ?? 'body',
                this.interpret.getDescription('', requestBody.instance),
                this.processSchema(requestSchema.name || 'rqsch', requestSchema.instance), {
                extensions: this.interpret.getExtensionProperties(requestBody.instance),
                protocol: {
                  http: new HttpParameter(ParameterLocation.Body, {
                    style: SerializationStyle.Binary,
                  })
                },
                implementation: ImplementationLocation.Method
              }));

            } else {
              // it has a body parameter, and we're going to use a schema for it.
              // add it as the last parameter 
              op.request.addParameter(new Parameter(
                requestBody.instance?.['x-ms-requestBody-name'] ?? 'body',
                this.interpret.getDescription('', requestBody.instance),
                this.processSchema(requestSchema.name || 'rqsch', requestSchema.instance), {
                extensions: this.interpret.getExtensionProperties(requestBody.instance),
                required: requestBody.instance.required,
                protocol: {
                  http: new HttpParameter(ParameterLocation.Body, {
                    style: SerializationStyle.Json,
                  })
                },
                implementation: ImplementationLocation.Method
              }));
            }
          }
            break;

          default:
            // invalid combinations should have been filtered, so WTH?
            throw new Error(`Requests with multiple unrelated body types not implemented yet. ${[...mediaTypeGroups.keys()]}`);
        }
      }

      // === Response === 
      for (const { key: responseCode, value: response } of this.resolveDictionary(operation.responses)) {

        const isErr = responseCode === 'default' || response['x-ms-error-response'];
        const knownMediaTypes = this.filterMediaTypes(response.content);

        if (length(knownMediaTypes) === 0) {
          // it has no actual response *payload*
          // so we just want to create a simple response .
          const rsp = new Response({
            extensions: this.interpret.getExtensionProperties(response)
          });
          const headers = new Array<HttpHeader>();
          for (const { key: header, value: hh } of this.resolveDictionary(response.headers)) {
            this.use(hh.schema, (n, sch) => {
              const hsch = this.processSchema(this.interpret.getName(header, sch), sch);
              hsch.language.default.header = header;
              headers.push(new HttpHeader(header, hsch));
            });
          }
          rsp.protocol.http = SetType(HttpResponse, {
            statusCodes: [responseCode],
            headers: headers.length ? headers : undefined,
          });
          if (isErr) {
            op.addException(rsp);
          } else {
            op.addResponse(rsp);
          }
        } else {
          for (const { key: knownMediaType, value: mediatypes } of items(knownMediaTypes)) {
            const allMt = mediatypes.map(each => each.mediaType);
            const headers = new Array<HttpHeader>();
            for (const { key: header, value: hh } of this.resolveDictionary(response.headers)) {
              this.use(hh.schema, (n, sch) => {
                const hsch = this.processSchema(this.interpret.getName(header, sch), sch);
                hsch.language.default.header = header;
                headers.push(new HttpHeader(header, hsch));
              });
            }

            if (knownMediaType === KnownMediaType.Binary) {
              // binary response needs different response type.
              const rsp = new BinaryResponse({
                extensions: this.interpret.getExtensionProperties(response)
              });
              rsp.protocol.http = SetType(HttpBinaryResponse, {
                statusCodes: [responseCode],
                knownMediaType: knownMediaType,
                mediaTypes: allMt,
                headers: headers.length ? headers : undefined,
              });
              if (isErr) {
                //op.addException(rsp);
                // errors should not be binary streams!
                throw new Error(`The response body should not be a binary! ${operation.operationId}/${responseCode}`);

              } else {
                op.addResponse(rsp);
              }
              continue;
            }

            const schema = mediatypes[0].schema.instance;

            if (schema) {
              let s = this.processSchema('response', schema);

              // response schemas should not be constant types. 
              // this replaces the constant value with the value type itself.

              if (s.type === SchemaType.Constant) {
                s = (<ConstantSchema>s).valueType;
              }
              const rsp = new SchemaResponse(s, {
                extensions: this.interpret.getExtensionProperties(response)
              });

              rsp.protocol.http = SetType(HttpResponse, {
                statusCodes: [responseCode],
                knownMediaType: knownMediaType,
                mediaTypes: allMt,
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
      }

      //op.addResponse()
      //op.addException();
    });
  }

  process() {
    let priority = 0;
    for (const { key: name, value: parameter } of this.resolveDictionary(this.input.components?.parameters).where(each => !this.processed.has(each.value))) {
      if (parameter['x-ms-parameter-location'] !== 'method') {
        if (parameter['x-ms-priority'] === undefined) {
          parameter['x-ms-priority'] = priority++;
        }
      }
    }


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
        // we don't process binary schemas
        if (this.interpret.isBinarySchema(schema)) {
          continue;
        }

        // if this schema is an empty object with no heirarchy, skip it.
        if (this.interpret.isEmptyObject(schema)) {
          continue;
        }
        this.processSchema(name, schema);
      }


    }
    return this.codeModel;
  }
}