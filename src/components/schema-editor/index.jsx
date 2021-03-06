import React, { Component } from 'react'
import FontAwesome from 'react-fontawesome'
import {
  Flex,
  Box,
  Input,
  Select,
  Button,
  DeleteButton,
  SchemaSieve
} from 'resin-components'
import styled from 'styled-components'
import _ from 'lodash'
import jsyaml from 'js-yaml'
import { connect } from 'react-redux'
import { actions } from '../../actions'
import * as GitHubService from '../../services/github'
import { FieldLabel, GreyDivider } from '../shared'
import Container from '../shared/container'
import { objectDiffCommitMessage, transformSchema } from '../../util'

const SAVE_CHANGE_DEBOUNCE = 1000

const sieve = SchemaSieve()

const ShortSelect = styled(Select)`
  max-width: 300px;
  background-color: white;
`

const ShortInput = styled(Input)`
  max-width: 300px;
  background-color: white;
`

const TypeSelect = ({ ...props }) => (
  <ShortSelect {...props}>
    {_.map(sieve.getTypes(), type => <option key={type}>{type}</option>)}
  </ShortSelect>
)

const StyledDeleteBtn = styled(DeleteButton)`
  position: absolute;
  right: -35px;
  top: 2px;

  &:hover + ${Flex}:after {
    content: '';
    content: '';
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    position: absolute;
    left: -5px;
    right: -5px;
    top: -5px;
    bottom: -5px;
  }
`

const Wrapper = styled.div`
  background-color: #f3f3f3;
  border-bottom: 2px solid #cccccc;
  margin-bottom: -10px;
  padding-bottom: 60px;
`

class SchemaEditor extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: false,
      edit: _.cloneDeep(this.props.schema),
      newFieldTitle: ''
    }

    this.saveChange = _.debounce(
      () => {
        const original = transformSchema(this.props.schema)
        const modified = transformSchema(this.state.edit)
        const message =
          `Edited schema, ` + objectDiffCommitMessage(original, modified)

        const source = jsyaml.safeDump(this.state.edit)
        this.setState({
          loading: true,
          lintError: null
        })
        GitHubService.commitSchema({
          content: source,
          message
        }).then(() => {
          this.props.setSchema(jsyaml.load(source))
          this.done()
          this.setState({
            loading: false
          })
        })
      },
      SAVE_CHANGE_DEBOUNCE,
      { leading: true, trailing: false }
    )
  }

  handleFieldEdit (name, e) {
    const val = e.target.value
    const edit = this.state.edit.map(field => {
      if (field.name === name) {
        field.type = val
      }
      return field
    })
    this.setState({ edit })
  }

  handleNewFieldTitleEdit (e) {
    const val = e.target.value
    this.setState({ newFieldTitle: val })
  }

  done () {
    this.props.setIsEditingSchema(false)
  }

  addNewField (e) {
    e.preventDefault()
    const edit = this.state.edit
    edit.push({ name: this.state.newFieldTitle, type: sieve.getTypes()[0] })
    this.setState({
      edit,
      newFieldTitle: ''
    })
  }

  remove (name) {
    const edit = this.state.edit.filter(field => {
      return field.name !== name
    })
    this.setState({ edit })
  }

  render () {
    const fields = _.map(this.state.edit, field => (
      <Box mb={28} style={{ position: 'relative' }} key={field.name}>
        <StyledDeleteBtn onClick={() => this.remove(field.name)} />
        <Flex>
          <Box width={250}>
            <FieldLabel>{field.name}</FieldLabel>
          </Box>
          <Box flex={1}>
            <TypeSelect
              value={field.type}
              onChange={e => this.handleFieldEdit(field.name, e)}
            />
          </Box>
        </Flex>
      </Box>
    ))

    return (
      <Wrapper>
        <GreyDivider />
        <Container>
          <Flex justify='space-between'>
            <h2 style={{ marginTop: 0 }}>Edit Schema</h2>
            {this.state.loading ? (
              <Box>
                <FontAwesome spin name='cog' />
              </Box>
            ) : (
              <Flex
                align='right'
                justify='flex-end'
                style={{ marginBottom: 30 }}
              >
                <Button style={{ marginRight: 10 }} onClick={() => this.done()}>
                  Cancel
                </Button>
                <Button
                  secondary
                  disabled={this.state.lintError}
                  onClick={() => this.saveChange()}
                >
                  <FontAwesome name='check' style={{ marginRight: 10 }} />
                  Save Changes
                </Button>
              </Flex>
            )}
          </Flex>

          {fields}

          <Box mt={90}>
            <form onSubmit={e => this.addNewField(e)}>
              <Flex>
                <Box width={250}>
                  <FieldLabel>Add a new field</FieldLabel>
                </Box>
                <Box flex={1}>
                  <ShortInput
                    mr={10}
                    value={this.state.newFieldTitle}
                    onChange={e => this.handleNewFieldTitleEdit(e)}
                    placeholder='Enter the field title'
                  />
                </Box>
                <Button onClick={e => this.addNewField(e)}>
                  <FontAwesome name='plus' style={{ marginRight: 10 }} />
                  Add field
                </Button>
              </Flex>
            </form>
          </Box>
        </Container>
      </Wrapper>
    )
  }
}

const mapStatetoProps = state => ({
  schema: state.schema,
  content: state.content
})

const mapDispatchToProps = dispatch => ({
  setIsEditingSchema: value => dispatch(actions.setIsEditingSchema(value)),
  setSchema: value => dispatch(actions.setSchema(value))
})

export default connect(mapStatetoProps, mapDispatchToProps)(SchemaEditor)
