import { jsonSchema } from 'ai';
import type {
  JSONSchema7,
  JSONSchema7Definition,
  JSONSchema7TypeName,
} from 'json-schema';

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

type Ctx = {
  defs: Record<string, JSONSchema7Definition>;
};

export type AiSchema<
  T,
  Flags extends {
    enum?: true;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  } = {},
> = {
  '~ai_type': Schema<T>;
  toJSONSchema: (ctx: Ctx) => JSONSchema7;
  describe: (description: string) => AiSchema<T, Flags>;
  orNull: () => AiSchema<T | null, Flags>;
  enum: Flags['enum'] extends true
    ? <V extends T>(...values: V[]) => AiSchema<V, Flags>
    : undefined;
  asRef: (name: string) => AiSchema<T>;
};

type ObjectSchema = {
  [key: string]: AiSchema<any, any> | ObjectSchema;
};

type TypeOfObjectSchema<T extends ObjectSchema> = T extends ObjectSchema
  ? {
      [K in keyof T]: T[K] extends AiSchema<infer U, any>
        ? U
        : T[K] extends ObjectSchema
        ? TypeOfObjectSchema<T[K]>
        : never;
    }
  : never;

function object<T extends ObjectSchema>(
  schema: T,
): AiSchema<TypeOfObjectSchema<T>> {
  function childrenToJsonSchema(
    jSchema: AiSchema<any, any> | ObjectSchema,
    ctx: Ctx,
  ): JSONSchema7 {
    if (isAiSchema(jSchema)) {
      return jSchema.toJSONSchema(ctx);
    }

    const properties: Record<string, JSONSchema7> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(jSchema)) {
      properties[key] = childrenToJsonSchema(value, ctx);
      required.push(key);
    }

    return { type: 'object', properties, required };
  }

  return {
    ...genericSchema,
    enum: undefined,
    toJSONSchema: (ctx) => {
      return childrenToJsonSchema(schema, ctx);
    },
  };
}

function array<T>(schema: AiSchema<T, any>): AiSchema<T[]> {
  return {
    ...genericSchema,
    enum: undefined,
    toJSONSchema: (ctx) => ({ type: 'array', items: schema.toJSONSchema(ctx) }),
  };
}

function describe(
  this: AiSchema<any, any>,
  description: string,
): AiSchema<any, any> {
  return {
    ...this,
    toJSONSchema: (ctx) => ({ ...this.toJSONSchema(ctx), description }),
  };
}

function orNull(this: AiSchema<any>): AiSchema<any> {
  return {
    ...this,
    toJSONSchema: (ctx) => {
      const schema = this.toJSONSchema(ctx);

      const uniqueTypes = new Set<JSONSchema7TypeName>();

      if (Array.isArray(schema.type)) {
        for (const type of schema.type) {
          uniqueTypes.add(type);
        }
      } else {
        uniqueTypes.add(schema.type!);
      }

      uniqueTypes.add('null');

      return {
        ...schema,
        type: Array.from(uniqueTypes),
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
    toJSONSchema: (ctx) => {
      const schema = this.toJSONSchema(ctx);

      return {
        ...schema,
        type: schema.type,
        enum: values,
      };
    },
  };
}

function asRef(this: AiSchema<any>, name: string): AiSchema<any> {
  return {
    ...this,
    toJSONSchema: (ctx) => {
      const schema = this.toJSONSchema(ctx);

      ctx.defs[name] = schema;

      return { $ref: `#/$defs/${name}` };
    },
  };
}

const genericSchema: Omit<
  AiSchema<any, any>,
  'toJSONSchema' | 'name' | 'enum'
> = {
  '~ai_type': undefined as any,
  describe,
  orNull,
  asRef,
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
    toJSONSchema: (ctx) => ({
      anyOf: schemas.map((schema) => schema.toJSONSchema(ctx)),
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

function objectIsEmpty(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

export function getSchema<
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
  const ctx: {
    defs: Record<string, JSONSchema7Definition>;
  } = {
    defs: {},
  };

  if (isAiSchema(schema)) {
    const generatedSchema = schema.toJSONSchema(ctx);

    if (!objectIsEmpty(ctx.defs)) {
      generatedSchema.$defs = ctx.defs;
    }

    return jsonSchema(generatedSchema);
  }

  const properties: Record<string, JSONSchema7> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(schema)) {
    properties[key] = (value as AiSchema<any, any>).toJSONSchema(ctx);
    required.push(key);
  }

  const generatedSchema: JSONSchema7 = {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };

  if (!objectIsEmpty(ctx.defs)) {
    generatedSchema.$defs = ctx.defs;
  }

  return jsonSchema(generatedSchema);
}

function ref<T>(name: string): AiSchema<T> {
  return {
    ...genericSchema,
    enum: undefined,
    toJSONSchema: () => ({ $ref: `#/$defs/${name}` }),
  };
}

function recursion<T>(
  name: string,
  self: (self: AiSchema<T>) => AiSchema<T>,
): AiSchema<T> {
  return {
    ...genericSchema,
    enum: undefined,
    toJSONSchema: (ctx) => {
      const schema = self(ref(name)).toJSONSchema(ctx);

      ctx.defs[name] = schema;

      return {
        $ref: `#/$defs/${name}`,
      };
    },
  };
}

export const aiSchemas = {
  object,
  string,
  array,
  number,
  boolean,
  getSchema,
  recursion,
  null: nullSchema,
  ref,
  union,
  primitiveUnion,
  integer,
};
