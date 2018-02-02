import React from 'react'
import PropTypes from 'prop-types'

import Utils from '../utils'

class Field extends React.Component {
  componentWillMount () {
    this.buildApi(this.props)
    this.context.formApi.register(this.props.field, this.fieldApi, [])
  }

  componentWillUnmount () {
    this.context.formApi.deregister(this.props.field)
  }

  componentWillReceiveProps (nextProps) {
    // If the field name or any validators change, we need to rebuild the api
    if (
      !Utils.isShallowEqual(this.props, nextProps, [
        'field',
        'preValidate',
        'validate',
        'asyncValidate'
      ])
    ) {
      this.buildApi(nextProps)
    }
  }

  // Optimization to only rerender if nessisary
  shouldComponentUpdate (nextProps, nextState, nextContext) {
    // Grab needed values
    const field = this.props.field
    const currentFormState = this.context.formState
    const nextFormState = nextContext.formState
    const pure = nextProps.pure

    // When pure, we need to check props and form state to determine if we
    // should update. Otherwise, update all the time.
    if (!pure) {
      return true
    }
    // check child props for changes so we know to re-render
    const nonChildrenProps = {
      ...this.props,
      children: null // do not compare children, that would be an anti-pattern
    }
    const nextNonChildrenProps = {
      ...nextProps,
      children: null
    }

    const shouldUpdate =
      Utils.get(nextFormState.values, field) !== Utils.get(currentFormState.values, field) ||
      Utils.get(nextFormState.touched, field) !== Utils.get(currentFormState.touched, field) ||
      Utils.get(nextFormState.errors, field) !== Utils.get(currentFormState.errors, field) ||
      Utils.get(nextFormState.warnings, field) !== Utils.get(currentFormState.warnings, field) ||
      Utils.get(nextFormState.successes, field) !== Utils.get(currentFormState.successes, field) ||
      Utils.get(nextFormState.validating, field) !==
      Utils.get(currentFormState.validating, field) ||
      Utils.get(nextFormState.validationFailed, field) !==
      Utils.get(currentFormState.validationFailed, field) ||
      !Utils.isShallowEqual(nextNonChildrenProps, nonChildrenProps) ||
      nextFormState.submits !== currentFormState.submits

    return shouldUpdate || false
  }

  buildApi = props => {
    // This binds all of the functions less often, and also won't trigger
    // changes when spreading the fieldApi as shallow props
    const { formApi } = this.context
    const { field, validate, preValidate, asyncValidate } = props

    const proxyWithValidateAll = (func, proxyArg) => (...args) => {
      func(...args)
      this.fieldApi.validateAll(proxyArg)
    }

    this.fieldApi = {
      setValue: proxyWithValidateAll(value => formApi.setValue(field, value)),
      setTouched: proxyWithValidateAll(touched => formApi.setTouched(field, touched), true),
      setError: error => formApi.setError(field, error),
      setWarning: warning => formApi.setWarning(field, warning),
      setSuccess: success => formApi.setSuccess(field, success),
      addValue: value => formApi.addValue(field, value),
      removeValue: index => formApi.addValue(field, index),
      swapValues: (...args) => formApi.addValue(field, ...args),
      reset: () => formApi.reset(field),
      validatingField: () => formApi.validatingField(field),
      doneValidatingField: () => formApi.doneValidatingField(field),
      validate: opts => formApi.validate(field, validate, opts),
      preValidate: opts => formApi.preValidate(field, preValidate, opts),
      asyncValidate: opts => formApi.asyncValidate(field, asyncValidate, opts),
      validateAll: immediateAsync => {
        this.fieldApi.preValidate()
        this.fieldApi.validate()
        if (immediateAsync) {
          this.fieldApi.asyncValidate()
        } else {
          // TODO debounce this with `this.props.debounce`
          // this.fieldApi.asyncValidate()
        }
      }
    }

    this.getFieldValues = () => ({
      fieldName: field,
      value: formApi.getValue(field),
      touched: formApi.getTouched(field),
      error: formApi.getError(field),
      warning: formApi.getWarning(field),
      success: formApi.getSuccess(field)
    })
  }

  render () {
    const {
      field,
      pure,
      render,
      component,
      children,
      validate,
      asyncValidate,
      ...rest
    } = this.props

    const inlineProps = {
      ...rest,
      ...this.fieldApi,
      ...this.getFieldValues()
    }

    const componentProps = {
      ...rest,
      fieldApi: {
        ...this.fieldApi,
        ...this.getFieldValues()
      }
    }

    if (component) {
      return React.createElement(component, componentProps, children)
    }
    if (render) {
      return render(inlineProps)
    }
    if (typeof children === 'function') {
      return children(inlineProps)
    }
    return children
  }
}

Field.contextTypes = {
  formApi: PropTypes.object,
  formState: PropTypes.object
}

export default Field
