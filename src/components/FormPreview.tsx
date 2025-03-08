import { Card, Tabs, Empty } from "antd";
import { useState } from "react";
import Form from "@rjsf/antd";
import { useStore } from "../store/useStore";
import validator from "@rjsf/validator-ajv8";
import ArrayWidget from "./widgets/ArrayWidget";
import { CodeBlock } from "./CodeBlock";

export const FormPreview = () => {
  const { schema, formData, updateFormData } = useStore();
  const [activeTab, setActiveTab] = useState("1");

  const tabs = [
    { key: "1", label: "Preview Form" },
    { key: "2", label: "Schema" },
    { key: "3", label: "Data" },
  ];

  // Helper function to get ordered field names
  const getOrderedFields = (properties: Record<string, any>): string[] => {
    return Object.entries(properties)
      .sort((a, b) => (a[1].metadata?.order || 0) - (b[1].metadata?.order || 0))
      .map(([fieldId]) => fieldId);
  };

  // Generate UI schema with field order
  const generateUiSchema = () => {
    const getOrderedFields = (
      properties: Record<string, SchemaField>
    ): string[] => {
      return Object.entries(properties)
        .sort(
          (a, b) => (a[1].metadata?.order || 0) - (b[1].metadata?.order || 0)
        )
        .map(([id]) => id);
    };

    const processObjectField = (field: SchemaField): any => {
      const uiSchema: any = {};

      if (field.properties) {
        uiSchema["ui:order"] = getOrderedFields(field.properties);

        // Process nested objects
        Object.entries(field.properties).forEach(([key, value]) => {
          if (value.type === "object") {
            uiSchema[key] = processObjectField(value);
          }
        });
      }

      return uiSchema;
    };

    const uiSchema: any = processObjectField({
      type: "object",
      properties: schema.properties,
    });

    // Add submit button options
    uiSchema["ui:submitButtonOptions"] = {
      props: {
        type: "primary",
      },
      submitText: "Submit",
    };

    return uiSchema;
  };

  const renderContent = () => {
    switch (activeTab) {
      case "1":
        const hasFields = Object.keys(schema.properties).length > 0;
        return hasFields ? (
          <Form
            style={{ marginBottom: "32px" }}
            schema={(() => {
              // Deep clean the schema to remove internal fields
              const cleanField = (field: any): any => {
                // First, create a copy without internal fields
                // First filter out internal fields
                const filteredEntries = Object.entries(field).filter(
                  ([key]) =>
                    !key.startsWith("_") &&
                    key !== "metadata" &&
                    key !== "$id" &&
                    key !== "id"
                );

                // Then remove any empty enum arrays
                const validEntries = filteredEntries.filter(
                  ([key, value]) => !(key === "enum" && Array.isArray(value) && value.length === 0)
                );

                const cleaned = Object.fromEntries(validEntries);

                // Handle nested objects
                if (cleaned.properties) {
                  cleaned.properties = Object.fromEntries(
                    Object.entries(cleaned.properties).map(([key, value]) => [
                      key,
                      cleanField(value),
                    ])
                  );
                }

                // Handle array items
                if (cleaned.items) {
                  cleaned.items = cleanField(cleaned.items);
                }

                return cleaned;
              };

              const cleanedSchema = {
                $schema: "http://json-schema.org/draft-07/schema#",
                type: "object",
                title: undefined,
                description: undefined,
                required: schema.required,
                properties: Object.fromEntries(
                  Object.entries(schema.properties).map(([key, value]) => [
                    key,
                    cleanField(value),
                  ])
                ),
              };

              console.log(
                "Cleaned Schema:",
                JSON.stringify(cleanedSchema, null, 2)
              );
              return cleanedSchema;
            })()}
            validator={validator}
            formData={formData}
            onChange={(e) => updateFormData(e.formData)}
            onSubmit={(e) => {
              // Form validation is handled by RJSF internally
              updateFormData(e.formData);
              setActiveTab("3");
            }}
            onError={(errors) => {
              console.log("Validation failed:", errors);
            }}
            widgets={{
              ArrayWidget: ArrayWidget,
            }}
            className="preview-form"
            showErrorList="bottom"
            uiSchema={generateUiSchema()}
            // uiSchema={{
            //   "ui:submitButtonOptions": {
            //     props: {
            //       type: "primary",
            //     },
            //     submitText: "Submit",
            //   },
            // }}
          />
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Empty
              description={
                <span>
                  Start building your form by adding fields from the left panel
                </span>
              }
            />
          </div>
        );
      case "2":
        return <CodeBlock code={schema} />;
      case "3":
        return <CodeBlock code={formData} />;
      default:
        return null;
    }
  };

  return (
    <Card style={{ height: "100%", overflow: "hidden" }}>
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 24px 0" }}>
          <Tabs items={tabs} activeKey={activeTab} onChange={setActiveTab} />
        </div>
        <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
          {renderContent()}
        </div>
      </div>
    </Card>
  );
};
