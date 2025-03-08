import { Button, message, theme } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import {
  tomorrow,
  duotoneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { MessageArgsProps } from "antd/es/message";

SyntaxHighlighter.registerLanguage("json", json);

interface CodeBlockProps {
  code: any;
}

export const CodeBlock = ({ code }: CodeBlockProps) => {
  const [messageApi, contextHolder] = message.useMessage();
  const { token } = theme.useToken();
  const isDarkMode = token.colorBgContainer === "#141414";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(code, null, 2));
      messageApi.success({
        content: "Copied to clipboard!",
        duration: 2,
        icon: <CopyOutlined />,
      });
    } catch (error) {
      messageApi.error({
        content: "Failed to copy",
        duration: 2,
      });
    }
  };

  return (
    <div className="code-block-wrapper">
      {contextHolder}
      <div className="code-block-container" style={{ overflow: "auto" }}>
        <Button
          className="copy-button"
          type="text"
          icon={<CopyOutlined />}
          onClick={handleCopy}
          title="Copy to clipboard"
        />
        <SyntaxHighlighter
          language="json"
          style={isDarkMode ? tomorrow : duotoneLight}
          customStyle={{
            margin: 0,
            padding: "16px",
            background: "transparent",
          }}
        >
          {JSON.stringify(code, null, 2)}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};
