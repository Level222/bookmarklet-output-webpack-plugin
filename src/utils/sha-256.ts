import crypto from "crypto";

const toHexString = (binary: Uint8Array) => {
  return [...binary]
    .map((num) => num.toString(16).padStart(2, "0"))
    .join("");
};

type Options = {
  salt?: string;
  stretching?: number;
};

const utf8Encoder = new TextEncoder();

export const sha256 = async (data: string, options: Options = {}): Promise<string> => {
  const { salt = "", stretching = 1 } = options;
  const binarySalt = utf8Encoder.encode(salt);

  let binaryHash = utf8Encoder.encode(data);
  for (let i = 0; i < stretching; i++) {
    const concatenatedData = new Uint8Array(binaryHash.length + binarySalt.length);
    concatenatedData.set(binaryHash);
    concatenatedData.set(binarySalt, binaryHash.length);
    binaryHash = new Uint8Array(await crypto.subtle.digest("SHA-256", concatenatedData));
  }

  return toHexString(binaryHash);
};
