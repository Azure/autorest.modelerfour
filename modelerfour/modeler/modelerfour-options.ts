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
}
