import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// Custom metadata to maintain field order
export interface FieldMetadata {
  order: number;
}

export interface SchemaField {
  $ref?: string;
  definitions?: Record<string, SchemaField>;
  additionalProperties?: boolean | SchemaField;

  // Schema identifier
  $id?: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  title: string;
  description?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  properties?: Record<string, SchemaField>;
  items?: SchemaField;
  default?: any;
  format?: string;
  enum?: Array<string | number | boolean>;
  const?: any;
  examples?: any[];
  multipleOf?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minProperties?: number;
  maxProperties?: number;
  propertyNames?: SchemaField;
  dependencies?: Record<string, string[] | SchemaField>;
  allOf?: SchemaField[];
  anyOf?: SchemaField[];
  oneOf?: SchemaField[];
  not?: SchemaField;
  if?: SchemaField;
  then?: SchemaField;
  else?: SchemaField;

  required?: string[];
  // Custom metadata
  metadata?: FieldMetadata;
}

interface FormState {
  theme: 'light' | 'dark';
  schema: {
    $schema?: string;
    type: 'object';
    title: string;
    description?: string;
    properties: Record<string, SchemaField>;
    required: string[];
  };
  formData: any;
  history: {
    past: Array<typeof schema>;
    future: Array<typeof schema>;
  };
  setTheme: (theme: 'light' | 'dark') => void;
  updateSchema: (schema: typeof schema) => void;
  updateFormData: (data: any) => void;
  addField: (field: SchemaField, objectName?: string) => void;
  removeField: (fieldId: string) => void;
  reorderField: (fieldId: string, direction: 'up' | 'down') => void;
  renameField: (oldId: string, newId: string) => void;
  updateField: (fieldId: string, updates: Partial<SchemaField>) => void;
  clearAll: () => void;
  undo: () => void;
  redo: () => void;
}

const initialSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {},
  required: [],
};

export const useStore = create<FormState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      schema: initialSchema,
      formData: {},
      history: {
        past: [],
        future: [],
      },

      setTheme: (theme) => set({ theme }),

      updateSchema: (schema) => {
        const currentSchema = get().schema;
        
        // Ensure schema has required fields
        const updatedSchema = {
          ...schema,
          $schema: schema.$schema || 'http://json-schema.org/draft-07/schema#',
          type: schema.type || 'object',
          properties: schema.properties || {},
          required: schema.required || [],
        };

        set((state) => ({
          schema: updatedSchema,
          history: {
            past: [...state.history.past, currentSchema],
            future: [],
          },
        }));
      },

      updateFormData: (data) => set({ formData: data }),

      addField: (field: SchemaField, objectName: string, parentId = '') => {
        if (!objectName) return; // Prevent adding fields without a name

        const getMaxOrder = (properties: Record<string, SchemaField>) => {
          return Object.values(properties).reduce((max, field) => 
            Math.max(max, field.metadata?.order || 0), -1);
        };
        const currentSchema = get().schema;
        
        // Function to get properties at path
        const getPropertiesAtPath = (path: string[]): Record<string, SchemaField> => {
          if (path.length === 0) return currentSchema.properties;
          return path.reduce((obj, key) => obj[key].properties, currentSchema.properties);
        };

        // Get the correct properties object based on parentId
        const parentPath = parentId ? parentId.split('.') : [];
        const targetProperties = getPropertiesAtPath(parentPath);
        
        // Get max order at this level
        const maxOrder = Object.values(targetProperties).reduce(
          (max, field) => Math.max(max, field.metadata?.order || 0),
          -1
        );

        // Create the new field with all properties
        const schemaField: SchemaField = {
          $id: uuidv4(),
          ...field,
          metadata: { order: maxOrder + 1 },
          ...(field.type === 'object' ? { 
            properties: field.properties || {},
            required: field.required || []
          } : {}),
          ...(field.type === 'array' ? {
            items: field.items || { type: 'string' }
          } : {})
        };

        // Function to update nested properties
        const updateNestedProperties = (obj: any, path: string[], value: any): any => {
          if (path.length === 0) return value;
          const [head, ...rest] = path;
          return {
            ...obj,
            [head]: rest.length === 0
              ? { ...obj[head], properties: { ...obj[head].properties, [objectName]: value } }
              : updateNestedProperties(obj[head], rest, value)
          };
        };

        set((state) => ({
          schema: {
            ...currentSchema,
            properties: parentId
              ? updateNestedProperties(currentSchema.properties, parentPath, schemaField)
              : { ...currentSchema.properties, [objectName]: schemaField },
          },
          history: {
            past: [...state.history.past, currentSchema],
            future: [],
          },
        }));
      },

      removeField: (fieldId: string, parentId = '') => {
        const getPropertiesAtPath = (path: string[]): Record<string, SchemaField> => {
          if (path.length === 0) return get().schema.properties;
          return path.reduce((obj, key) => obj[key].properties, get().schema.properties);
        };

        const parentPath = parentId ? parentId.split('.') : [];
        const properties = getPropertiesAtPath(parentPath);
        
        // Function to update nested properties
        const updateNestedProperties = (obj: any, path: string[], fieldId: string): any => {
          if (path.length === 0) {
            const { [fieldId]: removed, ...rest } = obj;
            return rest;
          }
          const [head, ...rest] = path;
          return {
            ...obj,
            [head]: {
              ...obj[head],
              properties: updateNestedProperties(obj[head].properties, rest, fieldId)
            }
          };
        };

        const currentSchema = get().schema;

        // Update required fields
        const parentField = parentId ? currentSchema.properties[parentId.split('.')[0]] : null;
        const requiredArray = parentField ? parentField.required || [] : currentSchema.required;
        const newRequired = requiredArray.filter(id => id !== fieldId);
        
        if (parentField) {
          parentField.required = newRequired;
        } else {
          currentSchema.required = newRequired;
        }

        set((state) => ({
          schema: {
            ...currentSchema,
            properties: parentId
              ? updateNestedProperties(currentSchema.properties, parentPath, fieldId)
              : (() => {
                  const { [fieldId]: removed, ...rest } = currentSchema.properties;
                  return rest;
                })(),
          },
          history: {
            past: [...state.history.past, currentSchema],
            future: [],
          },
        }));
      },

      reorderField: (fieldId, direction, parentId = '') => {
        const currentSchema = get().schema;
        
        // Function to get properties at path
        const getPropertiesAtPath = (path: string[]): Record<string, SchemaField> => {
          if (path.length === 0) return currentSchema.properties;
          return path.reduce((obj, key) => obj[key].properties, currentSchema.properties);
        };

        // Get the correct properties object based on parentId
        const parentPath = parentId ? parentId.split('.') : [];
        const targetProperties = getPropertiesAtPath(parentPath);
        
        // Sort fields by order
        const fields = Object.entries(targetProperties)
          .sort((a, b) => (a[1].metadata?.order || 0) - (b[1].metadata?.order || 0));
        
        const currentIndex = fields.findIndex(([id]) => id === fieldId);
        if (currentIndex === -1) return;
        
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= fields.length) return;
        
        // Get the orders we're swapping
        const currentOrder = fields[currentIndex][1].metadata?.order || currentIndex;
        const targetOrder = fields[newIndex][1].metadata?.order || newIndex;
        
        // Update orders in the properties
        const newProperties = Object.fromEntries(
          fields.map(([id, field], index) => {
            if (index === currentIndex) {
              return [id, { ...field, metadata: { ...field.metadata, order: targetOrder } }];
            }
            if (index === newIndex) {
              return [id, { ...field, metadata: { ...field.metadata, order: currentOrder } }];
            }
            return [id, field];
          })
        );
        
        // Function to update nested properties
        const updateNestedProperties = (obj: any, path: string[], value: any): any => {
          const [head, ...rest] = path;
          if (rest.length === 0) {
            return {
              ...obj,
              [head]: {
                ...obj[head],
                properties: value,
              },
            };
          }
          return {
            ...obj,
            [head]: updateNestedProperties(obj[head], rest, value),
          };
        };

        set((state) => ({
          schema: {
            ...currentSchema,
            properties: parentId
              ? updateNestedProperties(currentSchema.properties, parentPath, newProperties)
              : newProperties,
          },
          history: {
            past: [...state.history.past, currentSchema],
            future: [],
          },
        }));
      },

      renameField: (oldId, newId) => {
        const currentSchema = get().schema;
        const fields = Object.entries(currentSchema.properties);
        
        // Find the field and its data
        const fieldIndex = fields.findIndex(([id]) => id === oldId);
        if (fieldIndex === -1) return;
        
        // Create new fields array with renamed field
        const newFields = fields.map(([id, data], index) => 
          index === fieldIndex ? [newId, data] : [id, data]
        );
        
        // Convert back to object preserving order
        const newProperties = Object.fromEntries(newFields);
        
        set((state) => ({
          schema: {
            ...currentSchema,
            properties: newProperties,
            required: currentSchema.required.map(id => id === oldId ? newId : id),
          },
          history: {
            past: [...state.history.past, currentSchema],
            future: [],
          },
        }));
      },

      updateField: (fieldId: string, updates: Partial<SchemaField>, parentId = '') => {
        const currentSchema = get().schema;

        // Get the field to update
        const getField = (path: string[]): SchemaField | undefined => {
          if (path.length === 0) return currentSchema.properties[fieldId];
          return path.reduce((obj, key) => 
            obj?.[key]?.properties || {}, 
            currentSchema.properties
          )[fieldId];
        };

        const parentPath = parentId ? parentId.split('.') : [];
        const field = getField(parentPath);
        
        if (!field) {
          console.error('Field not found:', fieldId);
          return;
        }
        // Log the update operation
        console.log('Updating field:', fieldId, 'with updates:', updates, 'parentId:', parentId);
        // Update the field in the schema
        const updateFieldInSchema = (path: string[]): Record<string, SchemaField> => {
          if (path.length === 0) {
            // Update root level field
            const newProperties = { ...currentSchema.properties };
            if (updates.type && updates.type !== field.type) {
              // For type changes, create a new field
              newProperties[fieldId] = {
                $id: field.$id,
                type: updates.type,
                title: field.title,
                description: field.description,
                metadata: field.metadata,
                // Add type-specific properties
                ...(updates.type === 'object' ? { properties: {}, required: [] } : {}),
                ...(updates.type === 'array' ? { items: { type: 'string' } } : {})
              };
            } else {
              // For other updates, merge with existing field
              newProperties[fieldId] = { ...field, ...updates };
            }
            return newProperties;
          }

          // Update nested field
          const [head, ...rest] = path;
          const newProperties = { ...currentSchema.properties };
          if (!newProperties[head]) return newProperties;

          newProperties[head] = {
            ...newProperties[head],
            properties: updateFieldInSchema(rest)
          };
          return newProperties;
        };



        // Handle required field updates
        if (updates.required !== undefined) {
          const parentField = parentId ? currentSchema.properties[parentId.split('.')[0]] : null;
          const requiredArray = parentField?.required || currentSchema.required || [];
          const required = new Set(requiredArray);
          
          if (updates.required) {
            required.add(fieldId);
          } else {
            required.delete(fieldId);
          }
          
          const newRequired = Array.from(required);
          if (parentField) {
            parentField.required = newRequired;
          } else {
            currentSchema.required = newRequired;
          }
          
          delete updates.required;
        }





        // Update the schema with the new field
        const newProperties = updateFieldInSchema(parentPath);
        
        set((state) => ({
          schema: {
            ...currentSchema,
            properties: newProperties
          },
          history: {
            past: [...state.history.past, currentSchema],
            future: []
          }
        }));
      },

      clearAll: () => {
        // Clear local storage
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('json-form-builder-storage');
        }
        // Reset state
        set({
          schema: initialSchema,
          formData: {},
          history: { past: [], future: [] },
        });
      },

      undo: () => {
        const { past, future } = get().history;
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        set((state) => ({
          schema: previous,
          history: {
            past: newPast,
            future: [state.schema, ...future],
          },
        }));
      },

      redo: () => {
        const { past, future } = get().history;
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        set((state) => ({
          schema: next,
          history: {
            past: [...past, state.schema],
            future: newFuture,
          },
        }));
      },
    }),
    {
      name: 'json-form-builder-storage',
      partialize: (state) => ({
        theme: state.theme,
        schema: state.schema,
      }),
    }
  ));
