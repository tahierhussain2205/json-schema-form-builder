import { Layout, ConfigProvider, theme, App as AntApp } from "antd";
import { useStore } from "./store/useStore";
import { NavBar } from "./components/NavBar";
import { SchemaBuilder } from "./components/SchemaBuilder";
import { FormPreview } from "./components/FormPreview";
import "./App.css";

const { Content } = Layout;

function App() {
  const { theme: currentTheme } = useStore();

  return (
    <ConfigProvider
      theme={{
        algorithm:
          currentTheme === "dark"
            ? theme.darkAlgorithm
            : theme.defaultAlgorithm,
        token: {
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <Layout style={{ minHeight: "100vh" }} data-theme={currentTheme}>
          <NavBar />
          <Content style={{ padding: "12px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                height: "calc(100vh - 90px)",
              }}
            >
              <SchemaBuilder />
              <FormPreview />
            </div>
          </Content>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
