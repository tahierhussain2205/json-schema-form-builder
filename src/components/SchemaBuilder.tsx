import { useState } from "react";
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Collapse,
  InputNumber,
} from "antd";
import { ImportSchema } from "./ImportSchema";
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { useStore, SchemaField } from "../store/useStore";
import { v4 as uuidv4 } from "uuid";

const { Option } = Select;
const { Panel } = Collapse;

export const SchemaBuilder = () => {
  const [activePanels, setActivePanels] = useState<string[]>([]);
  const {
    addField,
    removeField,
    updateField,
    reorderField,
    renameField,
    schema,
    updateSchema,
  } = useStore();

  // Function to generate a nested path
  const getNestedPath = (parentPath: string, fieldId: string) => {
    return parentPath ? `${parentPath}.${fieldId}` : fieldId;
  };

  const handleMetadataUpdate = (updates: {
    title?: string;
    description?: string;
  }) => {
    updateSchema({
      ...schema,
      ...updates,
    });
  };

  const handleAddField = (parentPath: string = "") => {
    const fieldId = `field_${Date.now()}`;

    const newField: SchemaField = {
      $id: uuidv4(),
      type: "string",
      title: "New Field",
      description: "",
    };
    addField(newField, fieldId, parentPath);
  };

  const handleTypeChange = (
    fieldId: string,
    newType: SchemaField["type"],
    parentPath?: string
  ) => {
    // Create a clean field with the new type
    const updates: Partial<SchemaField> = {
      type: newType,
      format: undefined,
      // Reset type-specific properties
      minLength: undefined,
      maxLength: undefined,
      pattern: undefined,
      minimum: undefined,
      maximum: undefined,
      multipleOf: undefined,
      exclusiveMinimum: undefined,
      exclusiveMaximum: undefined,
      minItems: undefined,
      maxItems: undefined,
      uniqueItems: undefined,
      minProperties: undefined,
      maxProperties: undefined,
      enum: undefined,
      const: undefined,
      default: undefined,
      examples: undefined,
      // Add type-specific properties
      ...(newType === "object" ? { properties: {}, required: [] } : {}),
      ...(newType === "array" ? { items: { type: "string" } } : {}),
    };

    handleFieldUpdate(fieldId, updates, parentPath || "");
  };

  const handleFieldUpdate = (
    fieldId: string,
    updates: Partial<SchemaField>,
    parentPath = ""
  ) => {
    updateField(fieldId, updates, parentPath);
  };

  const renderEnumField = (
    fieldId: string,
    field: SchemaField,
    parentPath: string = ""
  ) => {
    const handleConstraintUpdate = (updates: Partial<SchemaField>) => {
      handleFieldUpdate(fieldId, updates, parentPath);
    };

    if (field.type === "string") {
      return (
        <Form.Item
          label="Enum Values"
          tooltip="Predefined values that users can choose from"
        >
          <Select
            mode="tags"
            style={{ width: "100%" }}
            placeholder="Enter enum values"
            value={field.enum as string[]}
            onChange={(values) =>
              handleFieldUpdate(fieldId, { enum: values }, parentPath)
            }
          />
        </Form.Item>
      );
    }
    if (field.type === "number") {
      return (
        <Form.Item
          label="Enum Values"
          tooltip="Predefined values that users can choose from"
        >
          <Select
            mode="tags"
            style={{ width: "100%" }}
            placeholder="Enter enum values"
            value={field.enum as number[]}
            onChange={(values) =>
              handleFieldUpdate(
                fieldId,
                {
                  enum: values.map((v) =>
                    typeof v === "string" ? parseFloat(v) : v
                  ),
                },
                parentPath
              )
            }
          />
        </Form.Item>
      );
    }
    return null;
  };

  const renderObjectProperties = (
    properties: Record<string, SchemaField>,
    parentPath: string
  ) => {
    if (!properties) return null;

    return Object.entries(properties)
      .sort((a, b) => (a[1].metadata?.order || 0) - (b[1].metadata?.order || 0))
      .map(([fieldId, field]) => (
        <Panel
          key={field.$id}
          header={
            <div style={{ display: "flex", alignItems: "center" }}>
              {field.title || fieldId}
            </div>
          }
          extra={
            <Space>
              <Button
                type="text"
                icon={<ArrowUpOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  reorderField(fieldId, "up", parentPath || "");
                }}
              />
              <Button
                type="text"
                icon={<ArrowDownOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  reorderField(fieldId, "down", parentPath || "");
                }}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  removeField(fieldId, parentPath || "");
                }}
              />
            </Space>
          }
        >
          <Form layout="vertical">
            <Form.Item
              label="Object Name"
              required
              tooltip="This will be used as the property key in the JSON Schema"
            >
              <Input
                value={fieldId}
                placeholder="e.g. user_details, address_info"
                onChange={(e) => {
                  e.stopPropagation();
                  const newId = e.target.value.trim()
                    ? e.target.value.toLowerCase().replace(/\s+/g, "_")
                    : "";
                  if (newId && schema.properties[newId] && newId !== fieldId) {
                    return;
                  }
                  renameField(fieldId, newId);
                  setActivePanels(
                    activePanels.map((key) =>
                      key === field.$id ? field.$id : key
                    )
                  );
                }}
              />
            </Form.Item>
            <Form.Item
              label="Title"
              required
              tooltip="This will be displayed as the field label"
            >
              <Input
                value={field.title}
                placeholder="e.g. User Details, Address Information"
                onChange={(e) =>
                  updateField(fieldId, { title: e.target.value }, parentPath)
                }
              />
            </Form.Item>
            <Form.Item
              label="Field Type"
              required
              tooltip="The type of value this field will accept"
            >
              <Select
                value={field.type}
                onChange={(value) => handleTypeChange(fieldId, value as SchemaField["type"], parentPath)}
              >
                <Option value="string">Text</Option>
                <Option value="number">Number</Option>
                <Option value="boolean">Boolean</Option>
                <Option value="array">Array</Option>
                <Option value="object">Object</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Description">
              <Input.TextArea
                value={field.description}
                onChange={(e) =>
                  updateField(
                    fieldId,
                    { description: e.target.value },
                    parentPath
                  )
                }
              />
            </Form.Item>
            <Form.Item label="Required">
              <Switch
                checked={schema.required?.includes(fieldId)}
                onChange={(checked) =>
                  updateField(fieldId, { required: checked }, parentPath)
                }
              />
            </Form.Item>
            {field.type === "object" ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      handleAddField(getNestedPath(parentPath, fieldId))
                    }
                    block
                  >
                    Add Field to {field.title || fieldId}
                  </Button>
                </div>
                {field.properties &&
                  Object.keys(field.properties).length > 0 && (
                    <Collapse>
                      {renderObjectProperties(
                        field.properties,
                        getNestedPath(parentPath, fieldId)
                      )}
                    </Collapse>
                  )}
              </>
            ) : (
              <>
                {field.type === "string" && (
                  <Form.Item
                    label="Format"
                    tooltip="Specify the format of the string value"
                  >
                    <Select
                      value={field.format}
                      onChange={(value) =>
                        handleFieldUpdate(fieldId, { format: value }, parentPath)
                      }
                      allowClear
                      placeholder="Select a format"
                    >
                      <Option value="date-time" title="Example: 2024-03-08T14:30:00Z">
                        Date-Time (ISO 8601)
                      </Option>
                      <Option value="date" title="Example: 2024-03-08">
                        Date (YYYY-MM-DD)
                      </Option>
                      <Option value="time" title="Example: 14:30:00">
                        Time (HH:MM:SS)
                      </Option>
                      <Option value="duration" title="Example: P3Y6M4DT12H30M5S">
                        Duration (ISO 8601)
                      </Option>
                      <Option value="email" title="Example: user@example.com">
                        Email Address
                      </Option>
                      <Option value="hostname" title="Example: example.com">
                        Hostname
                      </Option>
                      <Option value="ipv4" title="Example: 192.168.1.1">
                        IPv4 Address
                      </Option>
                      <Option value="ipv6" title="Example: 2001:db8::ff00:42:8329">
                        IPv6 Address
                      </Option>
                      <Option value="uri" title="Example: https://example.com">
                        URI/URL
                      </Option>
                      <Option value="uri-reference" title="Example: /home/user or https://example.com">
                        URI Reference
                      </Option>
                      <Option value="uuid" title="Example: 550e8400-e29b-41d4-a716-446655440000">
                        UUID
                      </Option>
                      <Option value="json-pointer" title="Example: /path/to/value">
                        JSON Pointer
                      </Option>
                      <Option value="regex" title="Example: ^[A-Za-z]+$">
                        Regular Expression
                      </Option>
                      <Option value="password">
                        Password
                      </Option>
                    </Select>
                  </Form.Item>
                )}
                {renderFieldConstraints(fieldId, field, parentPath)}
              </>
            )}
          </Form>
        </Panel>
      ));
  };

  const renderFieldConstraints = (
    fieldId: string,
    field: SchemaField,
    parentPath = ""
  ) => {
    const renderDefaultValue = () => {
      switch (field.type) {
        case "string":
          return (
            <Form.Item label="Default Value">
              <Input
                style={{ width: "100%" }}
                value={field.default}
                onChange={(e) =>
                  handleFieldUpdate(
                    fieldId,
                    { default: e.target.value },
                    parentPath
                  )
                }
              />
            </Form.Item>
          );
        case "number":
          return (
            <Form.Item label="Default Value">
              <InputNumber
                value={field.default}
                onChange={(value) =>
                  handleFieldUpdate(fieldId, { default: value }, parentPath)
                }
              />
            </Form.Item>
          );
        case "boolean":
          return (
            <Form.Item label="Default Value">
              <Switch
                checked={field.default}
                onChange={(checked) =>
                  handleFieldUpdate(fieldId, { default: checked }, parentPath)
                }
              />
            </Form.Item>
          );
        case "array":
          if (field.items?.enum) {
            return (
              <Form.Item label="Default Values">
                <Select
                  mode="multiple"
                  style={{ width: "100%" }}
                  placeholder="Select default values"
                  value={field.default || []}
                  onChange={(values) =>
                    handleFieldUpdate(fieldId, { default: values }, parentPath)
                  }
                  options={field.items.enum.map((value) => ({
                    label: String(value),
                    value,
                  }))}
                />
              </Form.Item>
            );
          }
          return null;
        default:
          return null;
      }
    };

    switch (field.type) {
      case "string":
        return (
          <>
            <Form.Item label="Min Length">
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                value={field.minLength}
                onChange={(value) =>
                  handleFieldUpdate(fieldId, { minLength: value })
                }
              />
            </Form.Item>
            <Form.Item label="Max Length">
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                value={field.maxLength}
                onChange={(value) =>
                  handleFieldUpdate(fieldId, { maxLength: value })
                }
              />
            </Form.Item>
            <Form.Item label="Pattern">
              <Input
                style={{ width: "100%" }}
                value={field.pattern}
                placeholder="Regular expression pattern"
                onChange={(e) =>
                  handleFieldUpdate(fieldId, { pattern: e.target.value })
                }
              />
            </Form.Item>
            {renderEnumField(fieldId, field)}
            {renderDefaultValue()}
          </>
        );
      case "number":
        return (
          <>
            <Form.Item label="Minimum">
              <InputNumber
                style={{ width: "100%" }}
                value={field.minimum}
                onChange={(value) =>
                  handleFieldUpdate(fieldId, { minimum: value })
                }
              />
            </Form.Item>
            <Form.Item label="Maximum">
              <InputNumber
                style={{ width: "100%" }}
                value={field.maximum}
                onChange={(value) =>
                  handleFieldUpdate(fieldId, { maximum: value })
                }
              />
            </Form.Item>
            {renderEnumField(fieldId, field)}
            {renderDefaultValue()}
          </>
        );
      case "boolean":
        return renderDefaultValue();
      case "array":
        return (
          <>
            {field.type === "array" && (
              <Form.Item
                label="Predefined Options"
                tooltip="Values that users can select from"
              >
                <Select
                  mode="tags"
                  style={{ width: "100%" }}
                  placeholder="Enter predefined options"
                  value={field.items?.enum || []}
                  onChange={(values) =>
                    handleFieldUpdate(fieldId, {
                      items: { ...field.items, enum: values },
                    })
                  }
                />
              </Form.Item>
            )}
            <Form.Item label="Min Items">
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                value={field.minItems}
                onChange={(value) =>
                  handleFieldUpdate(fieldId, { minItems: value })
                }
              />
            </Form.Item>
            <Form.Item label="Max Items">
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                value={field.maxItems}
                onChange={(value) =>
                  handleFieldUpdate(fieldId, { maxItems: value })
                }
              />
            </Form.Item>
            <Form.Item label="Unique Items">
              <Switch
                checked={field.uniqueItems}
                onChange={(checked) =>
                  handleFieldUpdate(fieldId, { uniqueItems: checked })
                }
              />
            </Form.Item>
            {renderDefaultValue()}
          </>
        );
      case "object":
        return null;
      default:
        return null;
    }
  };

  return (
    <Card
      title="Schema Builder"
      style={{ height: "100%", overflowY: "auto" }}
      extra={<ImportSchema />}
    >
      <Space
        direction="vertical"
        style={{ width: "100%", padding: "24px" }}
        size="large"
      >
        <Form layout="vertical">
          <Form.Item label="Form Title">
            <Input
              style={{ width: "100%" }}
              value={schema.title}
              onChange={(e) => handleMetadataUpdate({ title: e.target.value })}
              placeholder="Enter form title"
            />
          </Form.Item>
          <Form.Item label="Form Description">
            <Input.TextArea
              style={{ width: "100%" }}
              value={schema.description}
              onChange={(e) =>
                handleMetadataUpdate({ description: e.target.value })
              }
              placeholder="Enter form description"
              rows={3}
            />
          </Form.Item>
        </Form>
        <Collapse
          activeKey={activePanels}
          onChange={(keys) => setActivePanels(keys as string[])}
        >
          {renderObjectProperties(schema.properties, "")}
        </Collapse>
        <Button
          type="primary"
          onClick={() => handleAddField()}
          style={{ width: "100%" }}
          icon={<PlusOutlined />}
        >
          Add Field
        </Button>
      </Space>
    </Card>
  );
};
