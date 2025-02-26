import React from 'react';
import shortid from 'shortid';
import InfiniteScroll from 'react-infinite-scroller';
import {
  Row, Col, Checkbox, Tag, Tooltip, Button, Divider,
} from 'antd';
import cloneDeep from 'lodash/cloneDeep';
import pull from 'lodash/pull';
import orderBy from 'lodash/orderBy';
import pullAllBy from 'lodash/pullAllBy';
import filter from 'lodash/filter';
import PropTypes from 'prop-types';
import intl from 'react-intl-universal';
import Filter, {
  FILTER_TYPE_GENERIC,
  FILTER_OPERAND_TYPE_ALL,
  FILTER_OPERAND_TYPE_DEFAULT,
  FILTER_OPERAND_TYPE_NONE,
  FILTER_OPERAND_TYPE_ONE,
} from './index';
import styleFilter from '../styles/filter.module.scss';

class GenericFilter extends React.Component {
  /* @NOTE SQON Struct Sample
  {
      type: 'generic',
      data: {
          id: 'variant_type',
          operand: 'all',
          values: ['SNP', 'deletion']
      }
  }
  */
  static structFromArgs(id, values = [], operand = FILTER_OPERAND_TYPE_DEFAULT) {
    return {
      id,
      type: FILTER_TYPE_GENERIC,
      operand,
      values,
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      draft: null,
      selection: [],
      size: null,
      page: null,
      allOptions: null,
      loadedOptions: [],
    };
    this.getEditor = this.getEditor.bind(this);
    this.getEditorLabels = this.getEditorLabels.bind(this);
    this.getEditorDraftInstruction = this.getEditorDraftInstruction.bind(this);
    this.getEditorInstruction = this.getEditorInstruction.bind(this);
    this.handleSearchByQuery = this.handleSearchByQuery.bind(this);
    this.handleOperandChange = this.handleOperandChange.bind(this);
    this.handleSelectionChange = this.handleSelectionChange.bind(this);
    this.handleSelectNone = this.handleSelectNone.bind(this);
    this.handleSelectAll = this.handleSelectAll.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.loadMoreFacets = this.loadMoreFacets.bind(this);

    // @NOTE Initialize Component State
    const { data, dataSet } = props;
    this.state.draft = cloneDeep(data);
    this.state.selection = data.values ? cloneDeep(data.values) : [];
    this.state.page = 1;
    this.state.size = 10;
    this.state.allOptions = cloneDeep(dataSet);

    const { selection, allOptions } = this.state;
    if (selection.length > 0) {
      const value = filter(cloneDeep(dataSet), (o) => selection.includes(o.value));
      if (value.length === 0) {
        const selectedValue = [];
        selection.map((x) => selectedValue.push({ value: x, count: 0 }));
        allOptions.unshift(...selectedValue);
      } else {
        const sorted = orderBy(value, ['count'], ['desc']);
        pullAllBy(allOptions, cloneDeep(sorted), 'value');
        allOptions.unshift(...sorted);
      }
    }
  }

  getEditor() {
    const {
      selection, allOptions, loadedOptions,
    } = this.state;
    const selectAll = intl.get('screen.patientvariant.filter.selection.all');
    const selectNone = intl.get('screen.patientvariant.filter.selection.none');
    pullAllBy(allOptions, [{ value: '' }], 'value');

    const loadedOptionsClone = loadedOptions.length
      ? [...loadedOptions]
      : allOptions.slice(0, Math.min(10, allOptions.length));
    const options = loadedOptionsClone.map((option) => {
      const value = option.value.length < 30 ? option.value : `${option.value.substring(0, 25)} ...`;
      return {
        label: (
          <span className={styleFilter.checkboxValue}>
            <Tooltip title={option.value}>
              { value }
            </Tooltip>
            <Tag className={styleFilter.valueCount}>{ intl.get('components.query.count', { count: option.count }) }</Tag>
          </span>
        ),
        value: option.value,
      };
    });

    return {
      getLabels: this.getEditorLabels,
      getDraftInstruction: this.getEditorDraftInstruction,
      getInstruction: this.getEditorInstruction,
      contents: (
        <>
          <Row className={styleFilter.selectionToolBar}>
            <Button onClick={this.handleSelectAll}>{ selectAll }</Button>
            <Divider type="vertical" />
            <Button onClick={this.handleSelectNone}>{ selectNone }</Button>
          </Row>
          <Row>
            <Col span={24}>
              <Checkbox.Group
                onChange={this.handleSelectionChange}
                option={options.map((option) => option.value)}
                className={`${styleFilter.checkboxGroup} `}
                value={selection}
              >
                <div className="scrollFilter" ref={(ref) => { this.scrollParentRef = ref; }}>
                  <InfiniteScroll
                    pageStart={0}
                    loadMore={this.loadMoreFacets}
                    hasMore={allOptions.length > loadedOptions.length}
                    loader={<div className="loader" key={0}>Loading ...</div>}
                    useWindow={false}
                    getScrollParent={() => this.scrollParentRef}
                  >
                    { options.map((option) => (
                      <Row key={shortid.generate()}>
                        <Col className="checkboxLine">
                          <Checkbox
                            key={`${option.value}`}
                            className={selection.includes(option.value)
                              ? `${styleFilter.check} ${styleFilter.checkboxLabel}` : `${styleFilter.checkboxLabel}`}
                            value={option.value}
                          >
                            { option.label }
                          </Checkbox>
                        </Col>
                      </Row>
                    )) }
                  </InfiniteScroll>

                </div>

              </Checkbox.Group>
            </Col>
          </Row>
        </>
      ),
    };
  }

  getEditorDraftInstruction() {
    const { draft } = this.state;
    const { id, operand, values } = draft;

    return GenericFilter.structFromArgs(id, values, operand);
  }

  getEditorInstruction() {
    const { data } = this.props;
    const { id, operand, values } = data;

    return GenericFilter.structFromArgs(id, values, operand);
  }

  getEditorLabels() {
    const { data } = this.props;

    return {
      action: intl.get(`screen.patientvariant.filter.operand.${data.operand}`),
      targets: data.values,
    };
  }

  handleSearchByQuery(values) {
    const { dataSet } = this.props;

    const allOptions = cloneDeep(dataSet);

    const search = values.toLowerCase();
    const toKeep = filter(allOptions, (o) => (search === '' || o.value.toLowerCase().startsWith(search)));

    allOptions.length = 0;
    allOptions.push(...toKeep);

    const page = 1;
    const loadedOptions = allOptions.slice(
      0,
      Math.min(allOptions.length, page * 10),
    );

    this.setState({
      allOptions,
      loadedOptions,
    });
  }

  handlePageChange(page, size) {
    this.setState({
      page,
      size,
    });
  }

  handleSelectNone() {
    const { draft } = this.state;
    draft.values = [];
    this.setState({
      selection: [],
      draft,
    });
  }

  handleSelectAll() {
    const { draft } = this.state;
    const { dataSet } = this.props;
    const selection = dataSet.map((option) => option.value);
    draft.values = selection;
    this.setState({
      selection,
      draft,
    });
  }

  handleSelectionChange(values) {
    const {
      selection, allOptions, draft,
    } = this.state;
    const options = allOptions;

    options.forEach((x) => {
      if (selection.includes(x.value)) {
        if (!values.includes(x.value)) {
          pull(selection, x.value);
        }
      } else if (values.includes(x.value)) {
        selection.push(x.value);
      }
    });

    draft.values = selection;
    this.setState({
      selection,
      draft,
    });
  }

  handleOperandChange(operand) {
    const { config } = this.props;
    if (config.operands.indexOf(operand) !== -1) {
      const { draft } = this.state;
      draft.operand = operand;
      this.setState({ draft });
    }
  }

  loadMoreFacets(page) {
    const {
      allOptions,
      loadedOptions,
    } = this.state;
    const newlyLoadedOptions = allOptions.slice(
      loadedOptions.length,
      Math.min(allOptions.length, loadedOptions.length + page * 10),
    );

    this.setState({ loadedOptions: [...loadedOptions, ...newlyLoadedOptions] });
  }

  render() {
    const { allOptions, draft } = this.state;
    const { config } = this.props;

    return (
      <Filter
        {...this.props}
        draft={draft}
        config={config}
        type={FILTER_TYPE_GENERIC}
        editor={this.getEditor()}
        searchable
        onSearchCallback={this.handleSearchByQuery}
        onPageChangeCallBack={this.handlePageChange}
        onOperandChangeCallBack={this.handleOperandChange}
        sortData={allOptions}
      />
    );
  }
}

GenericFilter.propTypes = {
  data: PropTypes.shape({}).isRequired,
  dataSet: PropTypes.array.isRequired,
  category: PropTypes.string,
  config: PropTypes.shape({}),
};

GenericFilter.defaultProps = {
  category: '',
  config: {
    operands: [FILTER_OPERAND_TYPE_ALL, FILTER_OPERAND_TYPE_ONE, FILTER_OPERAND_TYPE_NONE],
  },
};

export default GenericFilter;
