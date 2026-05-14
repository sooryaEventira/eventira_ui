import type { GroupBase, StylesConfig } from 'react-select'

export type UntitledSelectOptionShape = { value: string; label: string }

const shadowSm = '0 1px 2px 0 rgb(0 0 0 / 0.05)'
const focusRingPrimary = '0 0 0 2px rgba(104, 56, 238, 0.2)'
const focusRingError = '0 0 0 2px rgba(244, 63, 94, 0.2)'

/**
 * Shared react-select visuals for untitled Select + CreatableMultiSelect:
 * slate border, shadow-sm, primary focus ring; menu rounded with primary selected option.
 */
export function getUntitledReactSelectStyles<Option extends UntitledSelectOptionShape>(
  error: string | undefined,
  isDisabled: boolean,
  isMulti: boolean
): StylesConfig<Option, boolean, GroupBase<Option>> {
  return {
    control: (base, state) => {
      const borderColor = error
        ? state.isFocused
          ? '#f43f5e'
          : '#fb7185'
        : state.isFocused
          ? '#6838EE'
          : '#cbd5e1'
      const boxShadow =
        state.isFocused && error
          ? `${focusRingError}, ${shadowSm}`
          : state.isFocused && !error
            ? `${focusRingPrimary}, ${shadowSm}`
            : shadowSm

      return {
        ...base,
        minHeight: '40px',
        height: 'auto',
        alignItems: 'center',
        borderRadius: '0.5rem',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor,
        boxShadow,
        '&:hover': {
          borderColor: error
            ? state.isFocused
              ? '#f43f5e'
              : '#fb7185'
            : state.isFocused
              ? '#6838EE'
              : '#cbd5e1',
          boxShadow:
            state.isFocused && error
              ? `${focusRingError}, ${shadowSm}`
              : state.isFocused && !error
                ? `${focusRingPrimary}, ${shadowSm}`
                : shadowSm
        },
        backgroundColor: isDisabled ? '#f9fafb' : '#ffffff',
        cursor: isDisabled ? 'not-allowed' : isMulti ? 'text' : 'pointer'
      }
    },
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
    singleValue: (base) => ({
      ...base,
      color: '#334155',
      fontSize: '14px',
      margin: 0
    }),
    valueContainer: (base) =>
      isMulti
        ? {
            ...base,
            padding: '2px 8px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            maxHeight: '92px',
            overflowY: 'auto'
          }
        : {
            ...base,
            padding: '2px 8px'
          },
    ...(isMulti
      ? {
          multiValue: (base) => ({
            ...base,
            backgroundColor: '#f1f5f9',
            borderRadius: '6px',
            margin: 0,
            maxWidth: '100%'
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: '#334155',
            fontSize: '14px',
            padding: '2px 6px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '220px'
          }),
          multiValueRemove: (base) => ({
            ...base,
            color: '#64748b',
            borderRadius: '0 6px 6px 0',
            '&:hover': {
              backgroundColor: '#e2e8f0',
              color: '#334155'
            }
          })
        }
      : {}),
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
      cursor: 'pointer',
      '&:hover': {
        color: '#64748b'
      }
    }),
    clearIndicator: (base) => ({
      ...base,
      color: '#94a3b8',
      padding: '8px',
      cursor: 'pointer',
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
      backgroundColor: state.isSelected ? '#6838EE' : state.isFocused ? '#f1f5f9' : '#ffffff',
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
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999
    })
  } as StylesConfig<Option, boolean, GroupBase<Option>>
}
