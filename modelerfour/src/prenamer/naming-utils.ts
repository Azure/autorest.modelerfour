import { Languages } from "@azure-tools/codemodel";
import { length, Dictionary } from "@azure-tools/linq";
import { removeSequentialDuplicates, fixLeadingNumber, deconstruct, Style, Styler } from "@azure-tools/codegen";

export function getNameOptions(typeName: string, components: Array<string>) {
  const result = new Set<string>();

  // add a variant for each incrementally inclusive parent naming scheme.
  for (let i = 0; i < length(components); i++) {
    const subset = Style.pascal([...removeSequentialDuplicates(components.slice(-1 * i, length(components)))]);
    result.add(subset);
  }

  // add a second-to-last-ditch option as <typename>.<name>
  result.add(
    Style.pascal([
      ...removeSequentialDuplicates([...fixLeadingNumber(deconstruct(typeName)), ...deconstruct(components.last)]),
    ]),
  );
  return [...result.values()];
}

interface SetNameOptions {
  removeDuplicates: boolean;
}

const setNameDefaultOptions: SetNameOptions = {
  removeDuplicates: true,
};

export function setName(
  thing: { language: Languages },
  styler: Styler,
  defaultValue: string,
  overrides: Dictionary<string>,
  options?: SetNameOptions,
) {
  setNameAllowEmpty(thing, styler, defaultValue, overrides, options);
  if (!thing.language.default.name) {
    throw new Error("Name is empty!");
  }
}

export function setNameAllowEmpty(
  thing: { language: Languages },
  styler: Styler,
  defaultValue: string,
  overrides: Dictionary<string>,
  options?: SetNameOptions,
) {
  options = { ...setNameDefaultOptions, ...options };

  thing.language.default.name = styler(
    defaultValue && isUnassigned(thing.language.default.name) ? defaultValue : thing.language.default.name,
    options.removeDuplicates,
    overrides,
  );
}

export function isUnassigned(value: string) {
  return !value || value.indexOf("·") > -1;
}
