import React, { useMemo, useCallback, forwardRef } from 'react'
import RSelect from 'react-select'
import type { SelectInstance } from 'react-select'
import { twMerge } from 'tailwind-merge'
import { getUntitledReactSelectStyles } from './untitledReactSelectStyles'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  description?: string
  error?: string
  options: SelectOption[]
  showCaret?: boolean
  optionClassName?: string
}

const Select = forwardRef<SelectInstance<SelectOption>, SelectProps>(
  (
    {
      label,
      description,
      error,
      options,
      className = '',
      showCaret = true,
      optionClassName = '',
      value,
      onChange,
      disabled,
      required,
      name,
      id,
      ..._rest
    },
    ref
  ) => {
    const styles = useMemo(() => {
      const base = getUntitledReactSelectStyles<SelectOption>(error, Boolean(disabled), false)
      if (!showCaret) {
        return {
          ...base,
          dropdownIndicator: () => ({ display: 'none' }),
          indicatorsContainer: (b) => ({ ...b, paddingRight: 0 })
        }
      }
      return base
    }, [error, disabled, showCaret])

    const selectedOption = useMemo(() => {
      const v = value === undefined || value === null ? '' : String(value)
      return options.find((o) => o.value === v) ?? null
    }, [options, value])

    const handleChange = useCallback(
      (opt: SelectOption | null) => {
        if (!onChange) return
        const next = opt?.value ?? ''
        const t = { value: next, name: name ?? '' } as unknown as HTMLSelectElement
        onChange({ target: t, currentTarget: t } as React.ChangeEvent<HTMLSelectElement>)
      },
      [onChange, name]
    )

    return (
      <label className="flex w-full min-w-0 flex-col gap-1">
        {label && <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>}
        <div className={twMerge('relative min-w-0', className)}>
          <RSelect<SelectOption, false>
            ref={ref}
            inputId={id}
            name={name}
            options={options}
            value={selectedOption}
            onChange={handleChange}
            isDisabled={Boolean(disabled)}
            isClearable={false}
            isSearchable={options.length > 12}
            styles={styles}
            classNamePrefix="untitled-select"
            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            menuPosition="fixed"
            required={required}
            aria-invalid={error ? true : undefined}
            classNames={
              optionClassName
                ? {
                    option: () => optionClassName
                  }
                : undefined
            }
          />
        </div>
        {description && !error && <span className="text-xs text-slate-400">{description}</span>}
        {error && <span className="text-xs text-rose-500">{error}</span>}
      </label>
    )
  }
)

Select.displayName = 'Select'

export default Select
