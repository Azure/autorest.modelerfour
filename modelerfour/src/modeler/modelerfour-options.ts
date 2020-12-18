/**
 * List of configuration that can be used with modelerfour.
 */
export interface ModelerFourOptions {
  /**
   * Flag to automatically add the Content-Type header to operations.
   */
  "always-create-content-type-parameter"?: boolean;

  /**
   * Flag to automatically add the Accept header to operations.
   */
  "always-create-accept-parameter"?: boolean;

  "always-seal-x-ms-enums"?: boolean;

  "flatten-models"?: boolean;

  "flatten-payloads"?: boolean;

  "keep-unused-flattened-models"?: boolean;

  "multiple-request-parameter-flattening"?: boolean;

  "group-parameters"?: boolean;

  "additional-checks"?: boolean;

  "lenient-model-deduplication"?: boolean;

  "naming"?: ModelerFourNamingOptions;

  "prenamer"?: boolean;

  "resolve-schema-name-collisons"?: boolean;

  /**
   * In the case where there is inheritance `Model > Parent > GrandParent` and Parent is empty,
   * remove the Parent class and change the reference `Model > GrandParent`.
   */
  "remove-unused-intermediate-parent-types"?: boolean;
}

export interface ModelerFourNamingOptions {
  "preserve-uppercase-max-length"?: number;
  "parameter"?: string;
  "property"?: string;
  "operation"?: string;
  "operationGroup"?: string;
  "header"?: string;
  "choice"?: string;
  "choiceValue"?: string;
  "constant"?: string;
  "constantParameter"?: string;
  "client"?: string;
  "type"?: string;
  "global"?: string;
  "local"?: string;
  "override"?: any;
}
