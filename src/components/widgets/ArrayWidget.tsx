import { WidgetProps } from '@rjsf/utils';
import { Select, SelectProps } from 'antd';

const ArrayWidget = ({
  id,
  value = [],
  required,
  disabled,
  readonly,
  onChange,
  schema,
}: WidgetProps) => {
  // Convert enum values to options if present
  const options: SelectProps['options'] = schema.items?.enum?.map(item => ({
    label: item,
    value: item
  })) || [];

  return (
    <Select
      id={id}
      mode="tags"
      size="middle"
      placeholder="Please select"
      value={value}
      onChange={onChange}
      style={{ width: '100%' }}
      options={options}
      disabled={disabled || readonly}
      status={required && value.length === 0 ? 'error' : undefined}
    />
  );
};

export default ArrayWidget;
