/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import { type Schema, jsonSchema } from 'ai';
import type {
  JSONSchema7,
  JSONSchema7Definition,
  JSONSchema7TypeName,
} from 'json-schema';

export type AiSdkInferType<T extends Schema<any>> =
  T extends Schema<infer U> ? U : never;

export type AiSchemaInferType<T extends InternalAiSchema<any, any>> =
  T extends InternalAiSchema<infer U, any> ? U : never;

type PrimitiveTypes = 'string' | 'number' | 'boolean' | 'integer' | 'null';

type Ctx = {
  defs: Record<string, JSONSchema7Definition>;
};

type SchemaFlags = {
  enum?: true;
  obj?: true;
};

type SchemaType<T> = (t: T) => T;

export type AiSchema<T> = InternalAiSchema<T, any>;

type InternalAiSchema<T, Flags extends SchemaFlags = {}> = {
  '~ai_type': SchemaType<T>;
  toJSONSchema: (ctx: Ctx) => JSONSchema7;
  describe: (description: string) => InternalAiSchema<T, Flags>;
  orNull: () => InternalAiSchema<T | null, Flags>;
  enum: Flags['enum'] extends true ?
    <V extends T>(...values: V[]) => InternalAiSchema<V>
  : undefined;
  asRef: (name: string) => InternalAiSchema<T>;
  or: <V extends InternalAiSchema<any, any>>(
    schema: V,
  ) => InternalAiSchema<T | AiSchemaInferType<V>>;
} & (Flags['obj'] extends true ?
  T extends AnyObj ?
    {
      omit: <K extends keyof T>(
        ...keys: K[]
      ) => InternalAiSchema<Omit<T, K>, Flags>;
      pick: <K extends keyof T>(
        ...keys: K[]
      ) => InternalAiSchema<Pick<T, K>, Flags>;
      merge: <W extends AnyObj>(
        object: InternalAiSchema<W, any>,
      ) => InternalAiSchema<Prettify<Merge<T, W>>, Flags>;
    }
  : Record<'omit' | 'pick' | 'merge', undefined>
: Record<'omit' | 'pick' | 'merge', undefined>);

type ObjectSchema = {
  [key: string]: InternalAiSchema<any, any> | ObjectSchema;
};

type TypeOfObjectSchema<T extends ObjectSchema> =
  T extends ObjectSchema ?
    {
      [K in keyof T]: T[K] extends InternalAiSchema<infer U, any> ? U
      : T[K] extends ObjectSchema ? TypeOfObjectSchema<T[K]>
      : never;
    }
  : never;

function objMergeMethod(
  this: InternalAiSchema<AnyObj, { obj: true }>,
  mergeWith: InternalAiSchema<AnyObj, any>,
): InternalAiSchema<AnyObj, { obj: true }> {
  return merge(this, mergeWith) as any;
}

function objPickMethod(
  this: InternalAiSchema<AnyObj, { obj: true }>,
  ...keys: string[]
): InternalAiSchema<Pick<AnyObj, (typeof keys)[number]>, { obj: true }> {
  return pick(this, keys) as any;
}

function objOmitMethod(
  this: InternalAiSchema<AnyObj, { obj: true }>,
  ...keys: string[]
): InternalAiSchema<Omit<AnyObj, (typeof keys)[number]>, { obj: true }> {
  return omit(this, keys) as any;
}

function object<T extends ObjectSchema>(
  schema: T,
): InternalAiSchema<TypeOfObjectSchema<T>, { obj: true }> {
  function childrenToJsonSchema(
    jSchema: InternalAiSchema<any, any> | ObjectSchema,
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

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    };
  }

  return {
    ...(genericSchema as any),
    enum: undefined,
    toJSONSchema: (ctx) => {
      return childrenToJsonSchema(schema, ctx);
    },
    merge: objMergeMethod,
    pick: objPickMethod,
    omit: objOmitMethod,
  };
}

type AnyObj = Record<string, any>;

export type Prettify<T> =
  T extends Record<string, any> ?
    {
      [K in keyof T]: Prettify<T[K]>;
    }
  : T;

type Merge<T extends AnyObj, W extends AnyObj> = Omit<T, keyof W> & W;

function merge<A extends AnyObj, B extends AnyObj>(
  a: InternalAiSchema<A, any>,
  b: InternalAiSchema<B, any>,
): InternalAiSchema<Prettify<Merge<A, B>>>;
function merge<A extends AnyObj, B extends AnyObj, C extends AnyObj>(
  a: InternalAiSchema<A, any>,
  b: InternalAiSchema<B, any>,
  c: InternalAiSchema<C, any>,
): InternalAiSchema<Prettify<Merge<Merge<A, B>, C>>>;
function merge<
  A extends AnyObj,
  B extends AnyObj,
  C extends AnyObj,
  D extends AnyObj,
>(
  a: InternalAiSchema<A, any>,
  b: InternalAiSchema<B, any>,
  c: InternalAiSchema<C, any>,
  d: InternalAiSchema<D, any>,
): InternalAiSchema<Prettify<Merge<Merge<Merge<A, B>, C>, D>>>;
function merge(
  ...schemas: InternalAiSchema<AnyObj, any>[]
): InternalAiSchema<AnyObj> {
  return {
    ...genericSchema,
    enum: undefined,
    toJSONSchema: (ctx) => {
      const finalSchemaProperties: Record<string, JSONSchema7> = {};
      const finalSchemaRequired: string[] = [];

      for (const schema of schemas) {
        const schemaJson = schema.toJSONSchema(ctx);

        if (schemaJson.type === 'object') {
          Object.assign(finalSchemaProperties, schemaJson.properties);

          finalSchemaRequired.push(...(schemaJson.required ?? []));
        } else {
          throw new Error('Merge only accepts object schemas');
        }
      }

      return {
        type: 'object',
        properties: finalSchemaProperties,
        required: finalSchemaRequired,
        additionalProperties: false,
      };
    },
  };
}

function pick<T extends AnyObj, K extends keyof T>(
  schema: InternalAiSchema<T, any>,
  keys: K[],
): InternalAiSchema<Pick<T, K>> {
  return {
    ...genericSchema,
    enum: undefined,
    toJSONSchema: (ctx) => {
      const schemaJson = schema.toJSONSchema(ctx);

      const properties: Record<string, JSONSchema7> = {};
      const required: string[] = [];

      for (const key of keys) {
        const prop = schemaJson.properties?.[key as string];

        if (prop && prop !== true) {
          properties[key as string] = prop;
          required.push(key as string);
        }
      }

      return {
        type: 'object',
        properties,
        required,
        additionalProperties: false,
      };
    },
  };
}

function omit<T extends AnyObj, K extends keyof T>(
  schema: InternalAiSchema<T, any>,
  keys: K[],
): InternalAiSchema<Omit<T, K>> {
  return {
    ...genericSchema,
    enum: undefined,
    toJSONSchema: (ctx) => {
      const schemaJson = schema.toJSONSchema(ctx);

      if (!schemaJson.properties) {
        return { type: 'object', properties: {}, required: [] };
      }

      const properties: Record<string, JSONSchema7> = {};
      const required: string[] = [];

      for (const [key, prop] of Object.entries(schemaJson.properties)) {
        if (prop && prop !== true && !keys.includes(key as K)) {
          properties[key] = prop;
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required,
        additionalProperties: false,
      };
    },
  };
}

function array<T>(schema: InternalAiSchema<T, any>): InternalAiSchema<T[]> {
  return {
    ...genericSchema,
    enum: undefined,
    toJSONSchema: (ctx) => ({ type: 'array', items: schema.toJSONSchema(ctx) }),
  };
}

function describe(
  this: InternalAiSchema<any, any>,
  description: string,
): InternalAiSchema<any, any> {
  return {
    ...this,
    toJSONSchema: (ctx) => ({ ...this.toJSONSchema(ctx), description }),
  };
}

function orNull(this: InternalAiSchema<any>): InternalAiSchema<any> {
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
  this: InternalAiSchema<T>,
  ...values: T[]
): InternalAiSchema<T> {
  return {
    ...this,
    toJSONSchema: (ctx) => {
      const schema = this.toJSONSchema(ctx);

      return {
        ...schema,
        enum: values,
      };
    },
  };
}

function asRef(
  this: InternalAiSchema<any>,
  name: string,
): InternalAiSchema<any> {
  return {
    ...this,
    toJSONSchema: (ctx) => {
      const schema = this.toJSONSchema(ctx);

      ctx.defs[name] = schema;

      return { $ref: `#/$defs/${name}` };
    },
  };
}

function or<T extends InternalAiSchema<any, any>>(
  this: InternalAiSchema<any, any>,
  schema: T,
): InternalAiSchema<any, any> {
  return union(this, schema);
}

const genericSchema = {
  '~ai_type': undefined as any,
  describe: describe as any,
  orNull: orNull as any,
  asRef,
  omit: undefined,
  pick: undefined,
  merge: undefined,
  or: or as any,
};

const string: InternalAiSchema<string, { enum: true }> = {
  ...genericSchema,
  enum: enumSchema,
  toJSONSchema: () => ({ type: 'string' }),
};

const number: InternalAiSchema<number, { enum: true }> = {
  ...genericSchema,
  enum: enumSchema,
  toJSONSchema: () => ({ type: 'number' }),
};

const boolean: InternalAiSchema<boolean, { enum: true }> = {
  ...genericSchema,
  enum: enumSchema,
  toJSONSchema: () => ({ type: 'boolean' }),
};

const integer: InternalAiSchema<number, { enum: true }> = {
  ...genericSchema,
  enum: enumSchema,
  toJSONSchema: () => ({ type: 'integer' }),
};

const nullSchema: InternalAiSchema<null> = {
  ...genericSchema,
  enum: undefined,
  toJSONSchema: () => ({ type: 'null' }),
};

function union<T extends InternalAiSchema<any, any>[]>(
  ...schemas: T
): InternalAiSchema<AiSchemaInferType<T[number]>> {
  return {
    ...genericSchema,
    enum: undefined,
    toJSONSchema: (ctx) => {
      const anyOf = schemas.map((schema) => schema.toJSONSchema(ctx));

      const canSimplifySchema = anyOf.every(
        (schema) =>
          !schema.description &&
          !schema.anyOf &&
          !schema.enum &&
          isUnionSimplifiableSchema(schema.type),
      );

      if (canSimplifySchema) {
        return {
          type: anyOf.flatMap((schema) =>
            Array.isArray(schema.type) ?
              schema.type.map((type) => type)
            : (schema.type as JSONSchema7TypeName),
          ),
        };
      }

      return {
        anyOf,
      };
    },
  };
}

function isUnionSimplifiableSchema(
  schemaType: JSONSchema7TypeName | JSONSchema7TypeName[] | undefined,
): unknown {
  if (!schemaType) {
    return false;
  }

  return (
    schemaType === 'string' ||
    schemaType === 'number' ||
    schemaType === 'boolean' ||
    schemaType === 'integer' ||
    schemaType === 'null' ||
    (Array.isArray(schemaType) && schemaType.every(isUnionSimplifiableSchema))
  );
}

function primitiveUnion<T extends PrimitiveTypes[]>(
  ...schemas: T
): InternalAiSchema<
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

function isAiSchema(schema: unknown): schema is InternalAiSchema<any, any> {
  return !!schema && typeof schema === 'object' && '~ai_type' in schema;
}

function objectIsEmpty(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

export function getSchema<
  T extends
    | InternalAiSchema<any, any>
    | Record<string, InternalAiSchema<any, any>>,
>(
  schema: T,
): Schema<
  T extends InternalAiSchema<any, any> ? AiSchemaInferType<T>
  : T extends Record<string, InternalAiSchema<any, any>> ?
    { [K in keyof T]: AiSchemaInferType<T[K]> }
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
    properties[key] = (value as InternalAiSchema<any, any>).toJSONSchema(ctx);
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

function ref<T>(name: string): InternalAiSchema<T> {
  return {
    ...genericSchema,
    enum: undefined,
    toJSONSchema: () => ({ $ref: `#/$defs/${name}` }),
  };
}

function recursion<T>(
  name: string,
  self: (self: InternalAiSchema<T>) => InternalAiSchema<T, any>,
): InternalAiSchema<T, {}> {
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
  merge,
  recursion,
  null: nullSchema,
  ref,
  pick,
  omit,
  union,
  primitiveUnion,
  integer,
};
