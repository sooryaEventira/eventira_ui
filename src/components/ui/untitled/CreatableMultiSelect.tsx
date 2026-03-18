import React, { useState, useCallback } from 'react'
import CreatableSelect from 'react-select/creatable'
import { StylesConfig, MultiValue, ActionMeta } from 'react-select'

export interface CreatableMultiSelectOption {
  value: string
  label: string
}

export interface CreatableMultiSelectProps {
  label?: string
  description?: string
  error?: string
  options: CreatableMultiSelectOption[]
  value?: CreatableMultiSelectOption[]
  placeholder?: string
  isDisabled?: boolean
  onChange?: (newValue: MultiValue<CreatableMultiSelectOption>, actionMeta: ActionMeta<CreatableMultiSelectOption>) => void
  onCreateOption?: (inputValue: string) => void
  className?: string
}

const CreatableMultiSelect: React.FC<CreatableMultiSelectProps> = ({
  label,
  description,
  error,
  options,
  value = [],
  placeholder = 'Select or create options...',
  isDisabled = false,
  onChange,
  onCreateOption,
  className = ''
}) => {
  const [localOptions, setLocalOptions] = useState<CreatableMultiSelectOption[]>(options)

  // Sync localOptions when options prop changes (e.g. async load after component mount)
  React.useEffect(() => {
    setLocalOptions(prev => {
      const merged = [...options]
      // Preserve any locally-created options not in the server list
      for (const lo of prev) {
        if (!merged.some(o => o.value === lo.value)) {
          merged.push(lo)
        }
      }
      return merged
    })
  }, [options])

  const handleCreateOption = useCallback(
    (inputValue: string) => {
      const newOption: CreatableMultiSelectOption = {
        value: inputValue.toLowerCase().replace(/\s+/g, '-'),
        label: inputValue
      }

      // Add new option to local options list
      setLocalOptions((prev) => {
        // Check if option already exists
        const exists = prev.some((opt) => opt.value === newOption.value || opt.label === newOption.label)
        if (exists) {
          return prev
        }
        return [...prev, newOption]
      })

      // react-select/creatable doesn't call onChange when onCreateOption is set —
      // call it manually so parent state (draft.tags) is updated immediately
      if (onChange) {
        const updatedValue = [...(value ?? []), newOption] as MultiValue<CreatableMultiSelectOption>
        onChange(updatedValue, { action: 'create-option', option: newOption } as ActionMeta<CreatableMultiSelectOption>)
      }

      // Call parent's onCreateOption if provided (e.g. to persist tag via API)
      if (onCreateOption) {
        onCreateOption(inputValue)
      }
    },
    [onCreateOption, onChange, value]
  )

  // Custom styles to match Untitled UI design system
  const customStyles: StylesConfig<CreatableMultiSelectOption, true> = {
    control: (base, state) => ({
      ...base,
      minHeight: '40px',
      height: '40px',
      borderColor: error ? '#fb7185' : state.isFocused ? '#6838EE' : '#cbd5e1',
      boxShadow: state.isFocused
        ? error
          ? '0 0 0 2px rgba(251, 113, 133, 0.2)'
          : '0 0 0 2px rgba(104, 56, 238, 0.2)'
        : 'none',
      '&:hover': {
        borderColor: error ? '#fb7185' : '#6838EE'
      },
      backgroundColor: isDisabled ? '#f9fafb' : '#ffffff',
      cursor: isDisabled ? 'not-allowed' : 'text'
    }),
    placeholder: (base) => ({
      ...base,
      color: '#94a3b8',
      fontSize: '14px'
    }),
    input: (base) => ({
      ...base,
      color: '#334155',
      fontSize: '14px',
      margin: 0,
      padding: 0
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 8px'
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: '#f1f5f9',
      borderRadius: '6px'
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: '#334155',
      fontSize: '14px',
      padding: '2px 6px'
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: '#64748b',
      borderRadius: '0 6px 6px 0',
      '&:hover': {
        backgroundColor: '#e2e8f0',
        color: '#334155'
      }
    }),
    indicatorsContainer: (base) => ({
      ...base,
      paddingRight: '8px'
    }),
    indicatorSeparator: (base) => ({
      ...base,
      display: 'none'
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: '#94a3b8',
      padding: '8px',
      '&:hover': {
        color: '#64748b'
      }
    }),
    clearIndicator: (base) => ({
      ...base,
      color: '#94a3b8',
      padding: '8px',
      '&:hover': {
        color: '#64748b'
      }
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      marginTop: '4px',
      zIndex: 9999
    }),
    menuList: (base) => ({
      ...base,
      padding: '4px'
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#6838EE'
        : state.isFocused
        ? '#f1f5f9'
        : '#ffffff',
      color: state.isSelected ? '#ffffff' : '#334155',
      fontSize: '14px',
      padding: '8px 12px',
      cursor: 'pointer',
      borderRadius: '6px',
      margin: '2px 0',
      '&:active': {
        backgroundColor: state.isSelected ? '#6838EE' : '#e2e8f0'
      }
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: '#64748b',
      fontSize: '14px',
      padding: '12px'
    })
  }

  return (
    <label className={`flex w-full flex-col gap-1 ${className}`}>
      {label && <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>}
      <div className="relative">
        <CreatableSelect
          isMulti
          isSearchable
          isClearable
          isDisabled={isDisabled}
          options={localOptions}
          value={value}
          onChange={onChange}
          onCreateOption={handleCreateOption}
          placeholder={placeholder}
          formatCreateLabel={(inputValue) => `Create '${inputValue}'`}
          createOptionPosition="first"
          styles={customStyles}
          classNamePrefix="creatable-select"
        />
      </div>
      {description && !error && <span className="text-xs text-slate-400">{description}</span>}
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </label>
  )
}

CreatableMultiSelect.displayName = 'CreatableMultiSelect'

export default CreatableMultiSelect

