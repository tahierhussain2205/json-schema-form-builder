import { useState } from "react";
import { Modal, Button, Input, Upload, message } from "antd";
import { UploadOutlined, ImportOutlined } from "@ant-design/icons";
import { useStore } from "../store/useStore";
import type { UploadFile } from "antd/es/upload/interface";
import type { RcFile } from "antd/es/upload";

const { TextArea } = Input;

export const ImportSchema = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const { updateSchema } = useStore();

  const showModal = () => setIsModalOpen(true);
  const handleCancel = () => {
    setIsModalOpen(false);
    setJsonText("");
  };

  // Validate JSON schema
  const validateSchema = (text: string): { valid: boolean; error: string | null } => {
    try {
      if (!text.trim()) {
        return { valid: false, error: "Please enter or upload a JSON schema" };
      }

      const schema = JSON.parse(text);

      // Validate basic schema structure
      if (typeof schema !== "object") {
        return { valid: false, error: "Invalid JSON Schema format. Schema must be an object." };
      }

      if (!schema.properties) {
        return { valid: false, error: "Invalid JSON Schema format. Schema must have a properties field." };
      }

      if (typeof schema.properties !== "object") {
        return { valid: false, error: "Invalid JSON Schema format. Properties must be an object." };
      }

      return { valid: true, error: null };
    } catch (error) {
      return { valid: false, error: "Invalid JSON format" };
    }
  };

  // Update validation status when text changes
  const handleTextChange = (text: string) => {
    setJsonText(text);
    const { valid, error } = validateSchema(text);
    setIsValid(valid);
    setValidationError(error);
  };

  const handleOk = () => {
    try {
      const schema = JSON.parse(jsonText);

      // Add IDs to all fields and ensure proper structure
      const processSchema = (obj: any) => {
        if (obj.properties) {
          Object.entries(obj.properties).forEach(
            ([key, field]: [string, any]) => {
              // Add ID
              if (!field["$id"]) {
                field["$id"] = crypto.randomUUID();
              }

              // Ensure type exists
              if (!field.type) {
                field.type = "string";
              }

              // Ensure title exists
              if (!field.title) {
                field.title = key
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
              }

              // Handle object type
              if (field.type === "object") {
                if (!field.properties) {
                  field.properties = {};
                }
                processSchema(field);
              }

              // Handle array type
              if (field.type === "array" && !field.items) {
                field.items = { type: "string" };
              }
            }
          );
        }
      };

      processSchema(schema);
      updateSchema(schema);
      setIsModalOpen(false);
      setJsonText("");
      message.success("Schema imported successfully");
    } catch (error) {
      message.error("Invalid JSON format");
    }
  };

  const handleUpload = async (file: RcFile) => {
    try {
      // Validate file type
      const isJSON = file.type === "application/json" || file.name.endsWith('.json');
      if (!isJSON) {
        message.error("You can only upload JSON files!");
        return false;
      }

      // Read file content
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsText(file);
      });

      handleTextChange(text);
      if (validateSchema(text).valid) {
        message.success("File uploaded successfully");
      }
      return false; // Prevent default upload behavior
    } catch (error) {
      message.error("Failed to read file");
      return false;
    }
  };

  return (
    <>
      <Button type="primary" icon={<ImportOutlined />} onClick={showModal}>
        Import
      </Button>
      <Modal
        title="Import JSON Schema"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Import"
        okButtonProps={{ disabled: !isValid }}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Upload
            accept=".json"
            showUploadList={false}
            beforeUpload={handleUpload}
            customRequest={() => {}}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Upload JSON File</Button>
          </Upload>
        </div>
        {validationError && (
          <div style={{ color: "#ff4d4f", marginBottom: "8px" }}>
            {validationError}
          </div>
        )}
        <TextArea
          placeholder="Or paste your JSON schema here..."
          value={jsonText}
          onChange={(e) => handleTextChange(e.target.value)}
          status={validationError ? "error" : undefined}
          style={{
            borderColor: isValid ? "#52c41a" : undefined,
          }}
          autoSize={{ minRows: 10, maxRows: 20 }}
        />
      </Modal>
    </>
  );
};
