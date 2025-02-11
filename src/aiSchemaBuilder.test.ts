import {
  typingTest,
  type TestTypeIsEqual,
} from '@ls-stack/utils/typingTestUtils';
import { jsonSchema } from 'ai';
import { describe, expect, test } from 'vitest';
import {
  aiSchemas as s,
  type AiSchemaInferType,
  type AiSdkInferType,
} from './aiSchemaBuilder';

describe('primitive schemas', () => {
  test('string schema', () => {
    const schema = s.string;

    typingTest.expectType<
      TestTypeIsEqual<AiSchemaInferType<typeof schema>, string>
    >();

    expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "type": "string",
      }
    `);
  });

  test('number schema', () => {
    const schema = s.number;

    typingTest.expectType<
      TestTypeIsEqual<AiSchemaInferType<typeof schema>, number>
    >();

    expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "type": "number",
      }
    `);
  });

  test('boolean schema', () => {
    const schema = s.boolean;

    typingTest.expectType<
      TestTypeIsEqual<AiSchemaInferType<typeof schema>, boolean>
    >();

    expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "type": "boolean",
      }
    `);
  });

  test('null schema', () => {
    const schema = s.null;

    typingTest.expectType<
      TestTypeIsEqual<AiSchemaInferType<typeof schema>, null>
    >();

    expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "type": "null",
      }
    `);
  });

  test('integer schema', () => {
    const schema = s.integer;

    typingTest.expectType<
      TestTypeIsEqual<AiSchemaInferType<typeof schema>, number>
    >();

    expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "type": "integer",
      }
    `);
  });
});

test('object schema', () => {
  const schema = s.object({
    name: s.string,
    age: s.number,
  });

  type InferredType = AiSchemaInferType<typeof schema>;

  typingTest.expectType<
    TestTypeIsEqual<InferredType, { name: string; age: number }>
  >();

  expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
    {
      "properties": {
        "age": {
          "type": "number",
        },
        "name": {
          "type": "string",
        },
      },
      "required": [
        "name",
        "age",
      ],
      "type": "object",
    }
  `);
});

describe('array schema', () => {
  test('array of primitive', () => {
    const schema = s.array(s.string);

    typingTest.expectType<
      TestTypeIsEqual<AiSchemaInferType<typeof schema>, string[]>
    >();

    expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "items": {
          "type": "string",
        },
        "type": "array",
      }
    `);
  });

  test('array of object', () => {
    const schema = s.array(s.object({ name: s.string, age: s.number }));

    type InferredSchema = AiSchemaInferType<typeof schema>;

    typingTest.expectType<
      TestTypeIsEqual<InferredSchema, { name: string; age: number }[]>
    >();

    expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "items": {
          "properties": {
            "age": {
              "type": "number",
            },
            "name": {
              "type": "string",
            },
          },
          "required": [
            "name",
            "age",
          ],
          "type": "object",
        },
        "type": "array",
      }
    `);
  });
});

test('union schema', () => {
  const schema = s.union(s.string, s.number);

  type InferredType = AiSchemaInferType<typeof schema>;

  typingTest.expectType<TestTypeIsEqual<InferredType, string | number>>();

  expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
    {
      "anyOf": [
        {
          "type": "string",
        },
        {
          "type": "number",
        },
      ],
    }
  `);
});

describe('primitive union schema', () => {
  test('return the correct schema', () => {
    const schema = s.primitiveUnion('string', 'number', 'boolean', 'integer');

    type InferredType = AiSchemaInferType<typeof schema>;

    typingTest.expectType<
      TestTypeIsEqual<InferredType, string | number | boolean>
    >();

    expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "type": [
          "string",
          "number",
          "boolean",
          "integer",
        ],
      }
    `);
  });

  test('with description', () => {
    const schema = s
      .primitiveUnion('string', 'number')
      .describe('Primitive union schema');

    typingTest.expectType<
      TestTypeIsEqual<AiSchemaInferType<typeof schema>, string | number>
    >();

    expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "description": "Primitive union schema",
        "type": [
          "string",
          "number",
        ],
      }
    `);
  });
});

test('.describe()', () => {
  const schema = s.getSchema({
    name: s.string.describe('String property'),
    age: s.number.describe('Number property'),
  });

  typingTest.expectType<
    TestTypeIsEqual<
      AiSdkInferType<typeof schema>,
      { name: string; age: number }
    >
  >();

  expect(schema).toEqual(
    jsonSchema({
      type: 'object',
      properties: {
        name: { type: 'string', description: 'String property' },
        age: { type: 'number', description: 'Number property' },
      },
      required: ['name', 'age'],
      additionalProperties: false,
    }),
  );
});

describe('orNull schema', () => {
  test('return the correct schema', () => {
    const object = s.object({
      number: s.number.orNull(),
      string: s.string.orNull(),
      boolean: s.boolean.orNull(),
      integer: s.integer.orNull(),
      null: s
        .object({
          name: s.string,
        })
        .orNull(),
    });

    typingTest.expectType<
      TestTypeIsEqual<
        AiSchemaInferType<typeof object>,
        {
          number: number | null;
          string: string | null;
          boolean: boolean | null;
          integer: number | null;
          null: { name: string } | null;
        }
      >
    >();

    expect(s.getSchema(object).jsonSchema).toMatchInlineSnapshot(`
      {
        "properties": {
          "boolean": {
            "type": [
              "boolean",
              "null",
            ],
          },
          "integer": {
            "type": [
              "integer",
              "null",
            ],
          },
          "null": {
            "properties": {
              "name": {
                "type": "string",
              },
            },
            "required": [
              "name",
            ],
            "type": [
              "object",
              "null",
            ],
          },
          "number": {
            "type": [
              "number",
              "null",
            ],
          },
          "string": {
            "type": [
              "string",
              "null",
            ],
          },
        },
        "required": [
          "number",
          "string",
          "boolean",
          "integer",
          "null",
        ],
        "type": "object",
      }
    `);
  });

  test('with description', () => {
    const schema = s.string.orNull().describe('String property');

    expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "description": "String property",
        "type": [
          "string",
          "null",
        ],
      }
    `);
  });
});

describe('enum schema', () => {
  test('return the correct schema', () => {
    const schema = s.string.enum('foo', 'bar');

    typingTest.expectType<
      TestTypeIsEqual<AiSchemaInferType<typeof schema>, 'foo' | 'bar'>
    >();

    expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "enum": [
          "foo",
          "bar",
        ],
        "type": "string",
      }
    `);
  });
});

test('generate schema', () => {
  const schema = s.getSchema({
    name: s.string,
  });

  typingTest.expectType<
    TestTypeIsEqual<AiSdkInferType<typeof schema>, { name: string }>
  >();

  expect(schema).toEqual(
    jsonSchema({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
      additionalProperties: false,
    }),
  );
});

test('generate single schema', () => {
  const schema = s.getSchema(s.boolean.describe('A boolean schema'));

  expect(schema).toEqual(
    jsonSchema({
      type: 'boolean',
      description: 'A boolean schema',
    }),
  );
});

test('nullable enum schema', () => {
  const schema = s.string
    .enum('red', 'blue')
    .orNull()
    .describe('Nullable color enum');

  expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "description": "Nullable color enum",
        "enum": [
          "red",
          "blue",
        ],
        "type": [
          "string",
          "null",
        ],
      }
    `);
});

test('nested and complex schema', () => {
  const schema = s.object({
    list: s.array(s.union(s.string, s.number).describe('string or number')),
    details: s
      .object({
        flag: s.boolean.orNull().describe('nullable boolean'),
        value: s.number,
      })
      .describe('details object'),
  });

  type InferredType = AiSchemaInferType<typeof schema>;
  typingTest.expectType<
    TestTypeIsEqual<
      InferredType,
      {
        list: (string | number)[];
        details: { flag: boolean | null; value: number };
      }
    >
  >();

  expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "properties": {
          "details": {
            "description": "details object",
            "properties": {
              "flag": {
                "description": "nullable boolean",
                "type": [
                  "boolean",
                  "null",
                ],
              },
              "value": {
                "type": "number",
              },
            },
            "required": [
              "flag",
              "value",
            ],
            "type": "object",
          },
          "list": {
            "items": {
              "anyOf": [
                {
                  "type": "string",
                },
                {
                  "type": "number",
                },
              ],
              "description": "string or number",
            },
            "type": "array",
          },
        },
        "required": [
          "list",
          "details",
        ],
        "type": "object",
      }
    `);
});

test('array schema with description', () => {
  const schema = s.array(s.number).describe('Array of numbers');
  expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "description": "Array of numbers",
        "items": {
          "type": "number",
        },
        "type": "array",
      }
    `);
});

test('number enum schema', () => {
  const schema = s.number.enum(1, 2, 3);
  expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "enum": [
          1,
          2,
          3,
        ],
        "type": "number",
      }
    `);
});

test('chaining orNull', () => {
  const schema = s.string.orNull().orNull();
  expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "type": [
          "string",
          "null",
        ],
      }
    `);
});

test('chained describe overrides', () => {
  const schema = s.string.describe('First').orNull().describe('Second');
  expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "description": "Second",
        "type": [
          "string",
          "null",
        ],
      }
    `);
});

test('generate empty object schema', () => {
  const schema = s.getSchema({});
  expect(schema).toEqual(
    jsonSchema({
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    }),
  );
});

test('union with enum child', () => {
  const schema = s.union(s.string, s.number.enum(1, 2, 3));
  expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
      {
        "anyOf": [
          {
            "type": "string",
          },
          {
            "enum": [
              1,
              2,
              3,
            ],
            "type": "number",
          },
        ],
      }
    `);
});

test('recursive schema', () => {
  type LinkedListNode = { value: number; next: LinkedListNode };

  const linkedListNode = s.recursion<LinkedListNode>('LinkedListNode', (self) =>
    s.object({
      value: s.number,
      next: self,
    }),
  );

  const linkedList = s.object({
    linkedList: linkedListNode,
  });

  type InferredType = AiSchemaInferType<typeof linkedList>;

  typingTest.expectType<
    TestTypeIsEqual<InferredType, { linkedList: LinkedListNode }>
  >();

  expect(s.getSchema(linkedList).jsonSchema).toMatchInlineSnapshot(`
      {
        "$defs": {
          "LinkedListNode": {
            "properties": {
              "next": {
                "$ref": "#/$defs/LinkedListNode",
              },
              "value": {
                "type": "number",
              },
            },
            "required": [
              "value",
              "next",
            ],
            "type": "object",
          },
        },
        "properties": {
          "linkedList": {
            "$ref": "#/$defs/LinkedListNode",
          },
        },
        "required": [
          "linkedList",
        ],
        "type": "object",
      }
    `);
});

test('as ref', () => {
  const refSchema = s
    .object({
      name: s.string,
    })
    .describe('Object schema')
    .asRef('Object');

  const schema = s.object({
    obj: refSchema,
    obj2: refSchema,
  });

  expect(s.getSchema(schema).jsonSchema).toMatchInlineSnapshot(`
    {
      "$defs": {
        "Object": {
          "description": "Object schema",
          "properties": {
            "name": {
              "type": "string",
            },
          },
          "required": [
            "name",
          ],
          "type": "object",
        },
      },
      "properties": {
        "obj": {
          "$ref": "#/$defs/Object",
        },
        "obj2": {
          "$ref": "#/$defs/Object",
        },
      },
      "required": [
        "obj",
        "obj2",
      ],
      "type": "object",
    }
  `);
});
