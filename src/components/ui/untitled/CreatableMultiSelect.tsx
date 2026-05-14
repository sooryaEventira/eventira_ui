import React, { useState, useCallback, useMemo } from 'react'
import CreatableSelect from 'react-select/creatable'
import { MultiValue, ActionMeta } from 'react-select'
import { getUntitledReactSelectStyles } from './untitledReactSelectStyles'

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
      // Preserve locally-created options not present in the new server list.
      // Compare by label (display name) so that value format changes (name → uuid)
      // between renders don't cause the same tag to appear twice.
      for (const lo of prev) {
        const loLabel = lo.label.trim().toLowerCase()
        if (!merged.some(o => o.label.trim().toLowerCase() === loLabel)) {
          merged.push(lo)
        }
      }
      return merged
    })
  }, [options])

  const handleCreateOption = useCallback(
    (inputValue: string) => {
      const newOption: CreatableMultiSelectOption = {
        value: inputValue,
        label: inputValue
      }

      // Add new option to local options list
      setLocalOptions((prev) => {
        const exists = prev.some(
          (opt) => opt.value === newOption.value || opt.label.toLowerCase() === newOption.label.toLowerCase()
        )
        if (exists) return prev
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

  const customStyles = useMemo(
    () => getUntitledReactSelectStyles<CreatableMultiSelectOption>(error, isDisabled, true),
    [error, isDisabled]
  )

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
          menuPortalTarget={document.body}
          menuPosition="fixed"
        />
      </div>
      {description && !error && <span className="text-xs text-slate-400">{description}</span>}
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </label>
  )
}

CreatableMultiSelect.displayName = 'CreatableMultiSelect'

export default CreatableMultiSelect

