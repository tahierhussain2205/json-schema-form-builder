import { Layout, Switch, Button, theme, Modal, Typography } from "antd";
import { useStore } from "../store/useStore";
import { DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";

const { Header } = Layout;

export const NavBar = () => {
  const { token } = theme.useToken();
  const { setTheme, theme: currentTheme, clearAll } = useStore();
  const [modal, contextHolder] = Modal.useModal();

  const showConfirm = () => {
    modal.confirm({
      title: "Are you sure you want to clear everything?",
      icon: <ExclamationCircleOutlined />,
      content:
        "This will remove all fields and form data. This action cannot be undone.",
      okText: "Yes, clear everything",
      cancelText: "No, keep my changes",
      okButtonProps: {
        danger: true,
      },
      onOk: clearAll,
    });
  };

  return (
    <>
      {contextHolder}
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#000",
          padding: "0 24px",
        }}
      >
        <Typography.Title
          style={{ fontSize: "18px", margin: 0, color: "white" }}
          level={3}
        >
          {"JSON Form Builder"}
        </Typography.Title>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            onClick={showConfirm}
          >
            Clear
          </Button>
          <Switch
            checkedChildren="🌙"
            unCheckedChildren="☀️"
            checked={currentTheme === "dark"}
            onChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </Header>
    </>
  );
};
