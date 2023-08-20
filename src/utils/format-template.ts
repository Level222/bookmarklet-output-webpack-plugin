const templateUsingOriginalString = <T>(
  callback: (originalString: string) => T
): (strings: TemplateStringsArray, ...values: unknown[]) => T => {
  return (strings, ...values) => {
    const joinedString = strings
      .map((str, i) => str + (values[i] ?? ""))
      .join("");
    return callback(joinedString);
  };
};

export const removeIndent = templateUsingOriginalString((originalString) => {
  const trimmed = originalString.replace(/^\n|\n[^\S\n]*$/g, "");
  const lines = trimmed.split("\n");
  const minIndent = lines.reduce((prev, line) => {
    const spaceLen = line.search(/\S/);
    return spaceLen !== -1 && spaceLen < prev ? spaceLen : prev;
  }, Infinity);
  return lines.map((line) => line.slice(minIndent)).join("\n");
});

export const oneLine = templateUsingOriginalString((originalString) => {
  return originalString.replace(/(?:\n|^)\s*/g, "");
});
