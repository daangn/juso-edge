export type ErrorMetadata = {
  by: string,
  code: string,
  message: string,
  resolution?: string,
};

function metadataToString(metadata: ErrorMetadata) {
  return [
    `${metadata.by}(${metadata.code}): ${metadata.message}`,
    metadata.resolution,
  ].filter(Boolean).join(' ');
}

export class InvalidArgumentsError extends Error {
  constructor(metadata: ErrorMetadata) {
    super(metadataToString(metadata));
  }
}

export class UnauthorizedError extends Error {
  constructor(metadata: ErrorMetadata) {
    super(metadataToString(metadata));
  }
}

export class ServiceError extends Error {
  constructor(metadata: ErrorMetadata) {
    super(metadataToString(metadata));
  }
}
