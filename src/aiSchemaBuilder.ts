import { jsonSchema } from 'ai';
import type { JSONSchema7 } from 'json-schema';

type Schema<T> = (t: T) => T;

type AiSdkSchema<T> = ReturnType<typeof jsonSchema<T>>;

export type AiSdkInferType<T extends AiSdkSchema<any>> = T extends AiSdkSchema<
  infer U
>
  ? U
  : never;

export type AiSchemaInferType<T extends AiSchema<any, any>> =
  T extends AiSchema<infer U, any> ? U : never;

type PrimitiveTypes = 'string' | 'number' | 'boolean' | 'integer' | 'null';

export type AiSchema<
  T,
  Flags extends {
    enum?: true;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  } = {},
> = {
  '~ai_type': Schema<T>;
  toJSONSchema: () => JSONSchema7;
  describe: (description: string) => AiSchema<T, Flags>;
  orNull: () => AiSchema<T | null, Flags>;
  enum: Flags['enum'] extends true
    ? <V extends T>(...values: V[]) => AiSchema<V, Flags>
    : undefined;
};

type TypeOfObjectSchema<T extends Record<string, AiSchema<any, any>>> =
  T extends Record<string, AiSchema<any, any>>
    ? { [K in keyof T]: AiSchemaInferType<T[K]> }
    : never;

function object<T extends Record<string, AiSchema<any, any>>>(
  schema: T,
): AiSchema<TypeOfObjectSchema<T>> {
  const properties: Record<string, JSONSchema7> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(schema)) {
    properties[key] = value.toJSONSchema();
    required.push(key);
  }

  return {
    ...genericSchema,
    enum: undefined,
    toJSONSchema: () => ({ type: 'object', properties, required }),
  };
}

function array<T>(schema: AiSchema<T, any>): AiSchema<T[]> {
  return {
    ...genericSchema,
    enum: undefined,
    toJSONSchema: () => ({ type: 'array', items: schema.toJSONSchema() }),
  };
}

function describe(
  this: AiSchema<any, any>,
  description: string,
): AiSchema<any, any> {
  return {
    ...this,
    toJSONSchema: () => ({ ...this.toJSONSchema(), description }),
  };
}

function orNull(this: AiSchema<any>): AiSchema<any> {
  return {
    ...this,
    toJSONSchema: () => {
      const schema = this.toJSONSchema();

      return {
        ...schema,
        type: Array.isArray(schema.type)
          ? [...schema.type, 'null']
          : [schema.type!, 'null'],
      };
    },
  };
}

function enumSchema<T extends string | number | boolean | null>(
  this: AiSchema<T>,
  ...values: T[]
): AiSchema<T> {
  return {
    ...this,
    toJSONSchema: () => ({ type: 'string', enum: values }),
  };
}

const genericSchema: Omit<
  AiSchema<any, any>,
  'toJSONSchema' | 'name' | 'enum'
> = {
  '~ai_type': undefined as any,
  describe,
  orNull,
};

const string: AiSchema<string, { enum: true }> = {
  ...genericSchema,
  enum: enumSchema,
  toJSONSchema: () => ({ type: 'string' }),
};

const number: AiSchema<number, { enum: true }> = {
  ...genericSchema,
  enum: enumSchema,
  toJSONSchema: () => ({ type: 'number' }),
};

const boolean: AiSchema<boolean, { enum: true }> = {
  ...genericSchema,
  enum: enumSchema,
  toJSONSchema: () => ({ type: 'boolean' }),
};

const integer: AiSchema<number, { enum: true }> = {
  ...genericSchema,
  enum: enumSchema,
  toJSONSchema: () => ({ type: 'integer' }),
};

const nullSchema: AiSchema<null> = {
  ...genericSchema,
  enum: undefined,
  toJSONSchema: () => ({ type: 'null' }),
};

function union<T extends AiSchema<any, any>[]>(
  ...schemas: T
): AiSchema<AiSchemaInferType<T[number]>> {
  return {
    ...genericSchema,
    enum: undefined,
    toJSONSchema: () => ({
      anyOf: schemas.map((schema) => schema.toJSONSchema()),
    }),
  };
}

function primitiveUnion<T extends PrimitiveTypes[]>(
  ...schemas: T
): AiSchema<
  {
    string: string;
    number: number;
    boolean: boolean;
    integer: number;
    null: null;
  }[T[number]]
> {
  return {
    ...genericSchema,
    orNull: undefined as never,
    enum: undefined as never,
    toJSONSchema: () => {
      return {
        type: schemas,
      };
    },
  };
}

function isAiSchema(schema: unknown): schema is AiSchema<any, any> {
  return !!schema && typeof schema === 'object' && '~ai_type' in schema;
}

export function generate<
  T extends AiSchema<any, any> | Record<string, AiSchema<any, any>>,
>(
  schema: T,
): AiSdkSchema<
  T extends AiSchema<any, any>
    ? AiSchemaInferType<T>
    : T extends Record<string, AiSchema<any, any>>
    ? { [K in keyof T]: AiSchemaInferType<T[K]> }
    : never
> {
  if (isAiSchema(schema)) {
    return jsonSchema(schema.toJSONSchema());
  }

  const properties: Record<string, JSONSchema7> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(schema)) {
    properties[key] = (value as AiSchema<any, any>).toJSONSchema();
    required.push(key);
  }

  return jsonSchema({
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  });
}

export const aiSchemas = {
  object,
  string,
  array,
  number,
  boolean,
  generate,
  null: nullSchema,
  union,
  primitiveUnion,
  integer,
};
