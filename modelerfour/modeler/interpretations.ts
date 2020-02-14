import { Session } from '@azure-tools/autorest-extension-base';
import * as OpenAPI from '@azure-tools/openapi';
import { values, length, items, ToDictionary, Dictionary, keys } from '@azure-tools/linq';
import { CodeModel, StringSchema, ChoiceSchema, XmlSerlializationFormat, ExternalDocumentation, ApiVersion, Deprecation, ChoiceValue, HttpModel, SetType } from '@azure-tools/codemodel';
import { StringFormat, JsonType } from '@azure-tools/openapi';
import { getPascalIdentifier } from '@azure-tools/codegen';

export interface XMSEnum {
  modelAsString?: boolean;
  values: [{ value: any; description?: string; name?: string }];
  name: string;
}


const removeKnownParameters = [
  'x-ms-metadata',
  'x-ms-enum',
  'x-ms-code-generation-settings',
  'x-ms-client-name',
  'x-ms-parameter-location',
  'x-ms-original',
  'x-ms-requestBody-name'
];

// ref: https://www.w3schools.com/charsets/ref_html_ascii.asp
const specialCharacterMapping: { [character: string]: string } = {
  '!': 'exclamation mark',
  '"': 'quotation mark',
  '#': 'number sign',
  '$': 'dollar sign',
  '%': 'percent sign',
  '&': 'ampersand',
  '\'': 'apostrophe',
  '(': 'left parenthesis',
  ')': 'right parenthesis',
  '*': 'asterisk',
  '+': 'plus sign',
  ',': 'comma',
  '-': 'hyphen',
  '.': 'period',
  '/': 'slash',
  ':': 'colon',
  ';': 'semicolon',
  '<': 'less-than',
  '=': 'equals-to',
  '>': 'greater-than',
  '?': 'question mark',
  '@': 'at sign',
  '[': 'left square bracket',
  '\\': 'backslash',
  ']': 'right square bracket',
  '^': 'caret',
  '_': 'underscore',
  '`': 'grave accent',
  '{': 'left curly brace',
  '|': 'vertical bar',
  '}': 'right curly brace',
  '~': 'tilde'
};

const apiVersionParameterNames = [
  'api-version',
  'apiversion',
];

export function getValidEnumValueName(originalString: string): string {
  if (typeof originalString === 'string') {
    return !originalString.match(/[A-Za-z0-9]/g) ?
      getPascalIdentifier(originalString.split('').map(x => specialCharacterMapping[x]).join(' '))
      : originalString;
  }
  return originalString;
}

export class Interpretations {
  isTrue(value: any) {
    return (value === true || value === 'true' || value === 'True' || value === 'TRUE');
  }

  getConstantValue(schema: OpenAPI.Schema, value: any) {

    switch (schema.type) {
      case JsonType.String:
        switch (schema.format) {
          // member should be byte array
          // on wire format should be base64url
          case StringFormat.Base64Url:
            // return this.parseBase64UrlValue(value);
            return value;

          case StringFormat.Byte:
          case StringFormat.Certificate:
            // return this.parseByteArrayValue(value);
            return value;

          case StringFormat.Char:
            // a single character
            return `${value}`.charAt(0);

          case StringFormat.Date:
            // return this.parseDateValue(value);
            return value;

          case StringFormat.DateTime:
            // return this.parseDateTimeValue(value);
            return value;

          case StringFormat.DateTimeRfc1123:
            // return this.parseDateTimeRfc1123Value(value);
            return value;

          case StringFormat.Duration:
            // return this.parseDurationValue(value);
            return value;

          case StringFormat.Uuid:
            return value;

          case StringFormat.Url:
            return value;

          case StringFormat.Password:
            throw new Error('Constant values for String/Passwords should never be in input documents');

          case StringFormat.OData:
            return value;

          case StringFormat.None:
          case undefined:
          case null:
            return value;

          default:
            // console.error(`String schema '${name}' with unknown format: '${schema.format}' is treated as simple string.`);
            throw new Error(`Unknown type for constant value for String '${schema.format}'--cannot create constant value.`);
        }

      case JsonType.Boolean:
        return this.isTrue(value);

      case JsonType.Number:
        return Number.parseFloat(value);

      case JsonType.Integer:
        return Number.parseInt(value);
    }
  }

  isApiVersionParameter(parameter: OpenAPI.Parameter): boolean {
    return !!(parameter['x-ms-api-version'] || apiVersionParameterNames.find(each => each === parameter.name.toLowerCase()));
  }
  getEnumChoices(schema: OpenAPI.Schema): Array<ChoiceValue> {
    if (schema && schema.enum) {
      const xmse = <XMSEnum>schema['x-ms-enum'];

      return xmse && xmse.values ?
        xmse.values.map((each) => {
          const name = getValidEnumValueName((each.name !== undefined) ? each.name : each.value);
          const value = this.getConstantValue(schema, each.value);
          return new ChoiceValue(`${name}`, each.description || ``, value);
        }) :
        schema.enum.map(each => {
          const name = getValidEnumValueName(each);
          const value = this.getConstantValue(schema, each);
          return new ChoiceValue(`${name}`, ``, value);
        });
    }
    return [];
  }
  isEmptyObject(schema: OpenAPI.Schema): boolean {
    return (schema.type === JsonType.Object && length(schema.allOf) + length(schema.anyOf) + length(schema.oneOf) + length(schema.properties) === 0 && !schema.discriminator);
  }

  getSerialization(schema: OpenAPI.Schema): any | undefined {
    const xml = this.getXmlSerialization(schema);
    if (xml) {
      return {
        xml
      };
    }
    return undefined;
  }

  getXmlSerialization(schema: OpenAPI.Schema): XmlSerlializationFormat | undefined {
    if (schema.xml) {
      return {
        attribute: schema.xml.attribute || false,
        wrapped: schema.xml.wrapped || false,
        name: schema.xml.name || undefined,
        namespace: schema.xml.namespace || undefined,
        prefix: schema.xml.prefix || undefined,
        extensions: this.getExtensionProperties(schema.xml)
      };
    }
    return undefined;
  }
  getExternalDocs(schema: OpenAPI.Schema): ExternalDocumentation | undefined {
    return undefined;
  }
  getExample(schema: OpenAPI.Schema): any {
    return undefined;
  }
  getApiVersions(schema: OpenAPI.Schema | OpenAPI.HttpOperation | OpenAPI.PathItem): Array<ApiVersion> | undefined {
    if (schema['x-ms-metadata'] && schema['x-ms-metadata']['apiVersions']) {
      const v = values(<Array<string>>schema['x-ms-metadata']['apiVersions']).select(each => SetType(ApiVersion, {
        version: each.replace(/^-/, '').replace(/\+$/, ''),
        range: each.startsWith('-') ? <any>'-' : each.endsWith('+') ? '+' : undefined
      })).toArray();
      return v;
    }
    return undefined;
  }
  getApiVersionValues(node: OpenAPI.Schema | OpenAPI.HttpOperation | OpenAPI.PathItem): Array<string> {
    if (node['x-ms-metadata'] && node['x-ms-metadata']['apiVersions']) {
      return values(<Array<string>>node['x-ms-metadata']['apiVersions']).distinct().toArray();
    }
    return [];
  }
  getDeprecation(schema: OpenAPI.Schema): Deprecation | undefined {
    if (schema.deprecated) {
      // todo
    }
    return undefined;
  }

  constructor(private session: Session<OpenAPI.Model>, private codeModel: CodeModel) {
  }

  xmsMeta(obj: any, key: string) {
    const m = obj['x-ms-metadata'];
    return m ? m[key] : undefined;
  }

  splitOpId(opId: string) {
    const p = opId.indexOf('_');

    return p != -1 ? {
      group: opId.substr(0, p),
      member: opId.substr(p + 1)
    } : {
        group: '',
        member: opId
      };
  }

  isBinarySchema(schema: OpenAPI.Schema | undefined) {
    return !!(schema && (schema.format === StringFormat.Binary || schema.format === 'file' || <any>schema.type === 'file'));
  }

  getOperationId(httpMethod: string, path: string, original: OpenAPI.HttpOperation) {
    if (original.operationId) {
      return this.splitOpId(original.operationId);
    }

    // synthesize from tags.
    if (original.tags && length(original.tags) > 0) {

      switch (length(original.tags)) {
        case 0:
          break;
        case 1:
          this.session.warning(`Generating 'operationId' for '${httpMethod}' operation on path '${path}' `, ['Interpretations'], original);
          return this.splitOpId(`${original.tags[0]}`);
      }
      this.session.warning(`Generating 'operationId' for '${httpMethod}' operation on path '${path}' `, ['Interpretations'], original);
      return this.splitOpId(`${original.tags[0]}_${original.tags[1]}`);
    }
    this.session.error(`NEED 'operationId' for '${httpMethod}' operation on path '${path}' `, ['Interpretations'], original);

    return this.splitOpId('unknown-method');
  }


  getDescription(defaultValue: string, original: OpenAPI.Extensions & { title?: string; summary?: string; description?: string }): string {
    if (original) {
      return original.description || original.title || original.summary || defaultValue;
    }
    return defaultValue;
  }

  getPreferredName(original: any, preferredName?: string, fallbackName?: string) {
    return original['x-ms-client-name'] ?? preferredName ?? original?.['x-ms-metadata']?.['name'] ?? fallbackName ?? original['name'] ?? 'MISSING_NAME';
  }

  getName(defaultValue: string, original: any): string {

    return original['x-ms-client-name'] ?? original?.['x-ms-metadata']?.['name'] ?? defaultValue;
  }

  /** gets the operation path from metadata, falls back to the OAI3 path key */
  getPath(pathItem: OpenAPI.PathItem, operation: OpenAPI.HttpOperation, path: string) {
    return this.xmsMeta(pathItem, 'path') || this.xmsMeta(operation, 'path') || path;
  }


  /*
    /** creates server entries that are kept in the codeModel.protocol.http, and then referenced in each operation
     * 
     * @note - this is where deduplication of server entries happens.
      * /
    getServers(operation: OpenAPI.HttpOperation): Array<HttpServer> {
  
      return values(operation.servers).select(server => {
        const p = <HttpModel>this.codeModel.protocol.http;
        const f = p && p.servers.find(each => each.url === server.url);
        if (f) {
          return f;
        }
        const s = new HttpServer(server.url, this.getDescription('MISSING-SERVER-DESCRIPTION', server));
        if (server.variables && length(server.variables) > 0) {
          s.variables = items(server.variables).where(each => !!each.key).select(each => {
            const description = this.getDescription('MISSING-SERVER_VARIABLE-DESCRIPTION', each.value);
  
            const variable = each.value;
  
            const schema = variable.enum ?
              this.getEnumSchemaForVarible(each.key, variable) :
              this.codeModel.schemas.add(new StringSchema(`ServerVariable/${each.key}`, description));
  
            const serverVariable = new ServerVariable(
              each.key,
              this.getDescription('MISSING-SERVER_VARIABLE-DESCRIPTION', variable),
              schema,
              {
                default: variable.default,
                // required:  TODO: implement required on server variables
              });
            return serverVariable;
          }).toArray();
        }
  
        (<HttpModel>this.codeModel.protocol.http).servers.push(s);
        return s;
  
      }).toArray();
    }
  */

  getEnumSchemaForVarible(name: string, somethingWithEnum: { enum?: Array<string> }): ChoiceSchema {
    return new ChoiceSchema(name, this.getDescription('MISSING-SERVER-VARIABLE-ENUM-DESCRIPTION', somethingWithEnum));
  }

  getExtensionProperties(dictionary: Dictionary<any>, additional?: Dictionary<any>): Dictionary<any> | undefined {
    const main = Interpretations.getExtensionProperties(dictionary);
    if (additional) {
      const more = Interpretations.getExtensionProperties(additional);
      if (more) {
        return { ...main, ...more };
      }
    }
    return main;
  }

  static getExtensionProperties(dictionary: Dictionary<any>): Dictionary<any> | undefined {
    const result = ToDictionary(OpenAPI.includeXDash(dictionary), each => dictionary[each]);
    for (const each of removeKnownParameters) {
      delete result[each];
    }
    return length(result) === 0 ? undefined : result;
  }
}
