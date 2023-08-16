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
  return originalString
    .replace(/^\s+/gm, "")
    .trim();
});

export const oneLine = templateUsingOriginalString((originalString) => {
  return originalString.replace(/^\s+|\n/, "");
});
