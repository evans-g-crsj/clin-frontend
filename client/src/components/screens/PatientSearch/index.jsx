import React from 'react';
import PropTypes from 'prop-types';
import intl from 'react-intl-universal';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Card, AutoComplete, Row, Col, Input, Typography, Button, Menu, Divider, Checkbox,
} from 'antd';
import { ExportToCsv } from 'export-to-csv';
import IconKit from 'react-icons-kit';
import {
  ic_add, ic_keyboard_arrow_right, ic_tune, ic_close, ic_search, ic_keyboard_arrow_down,
} from 'react-icons-kit/md';
import { SearchOutlined } from '@ant-design/icons';
import {
  debounce,
} from 'lodash';

import './style.scss';
import style from '../../../containers/App/style.module.scss';

import { createCellRenderer } from '../../Table/index';
import InteractiveTable from '../../Table/InteractiveTable';
import { searchShape } from '../../../reducers/search';
import { navigateToPatientScreen, navigateToSubmissionScreen } from '../../../actions/router';
import { autoCompletePatients, searchPatientsByQuery, autoCompletePatientsSelected } from '../../../actions/patient';
import { updateUserColumns, updateUserColumnsOrder, updateUserColumnsReset } from '../../../actions/user';
import { appShape } from '../../../reducers/app';
import Layout from '../../Layout';

class PatientSearchScreen extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      size: 25,
      page: 1,
      isFacetOpen: false,
      facetFilterOpen: [],
      facet: [],
    };
    this.handleAutoCompleteChange = debounce(this.handleAutoCompleteChange.bind(this), 250, { leading: true });
    this.handleAutoCompleteSelect = this.handleAutoCompleteSelect.bind(this);
    this.handleAutoCompletePressEnter = this.handleAutoCompletePressEnter.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handlePageSizeChange = this.handlePageSizeChange.bind(this);
    this.exportToTsv = this.exportToTsv.bind(this);
    this.handleOpenFacet = this.handleOpenFacet.bind(this);
    this.isCategorieFacetOpen = this.isCategorieFacetOpen.bind(this);
    this.handleGoToPatientScreen = this.handleGoToPatientScreen.bind(this);
    this.getValue = this.getValue.bind(this);
    this.getData = this.getData.bind(this);
    this.handleCategoriesOpenChange = this.handleCategoriesOpenChange.bind(this);
    this.handleGotoSubmissionPage = this.handleGotoSubmissionPage.bind(this);
    this.handleColumnsUpdated = this.handleColumnsUpdated.bind(this);
    this.handleColumnsOrderUpdated = this.handleColumnsOrderUpdated.bind(this);
    this.handleColumnsReset = this.handleColumnsReset.bind(this);

    // @NOTE Initialize Component State
    this.state.facet = [
      'practitioner',
      'status',
      'familyComposition',
      'position',
      'organization',
    ];
    this.columnPreset = [
      {
        key: 'status',
        label: 'screen.patientsearch.table.status',
        renderer: createCellRenderer('dot', this.getData, {
          key: 'status',
          renderer: (value) => {
            switch (value) {
              case intl.get('screen.patientsearch.status.draft'):
                return '#D2DBE4';
              case intl.get('screen.patientsearch.status.on-hold'):
                return '#D46B08';
              case intl.get('screen.patientsearch.status.active'):
                return '#1D8BC6';
              case intl.get('screen.patientsearch.status.revoked'):
                return '#CF1322';
              case intl.get('screen.patientsearch.status.completed'):
                return '#389E0D';
              case intl.get('screen.patientsearch.status.incomplete'):
                return '#EB2F96';
                // empty rows
              case '':
                return 'transparent';
              default:
                return '#EB2F96';
            }
          },
        }),
      },
      {
        key: 'patientId',
        label: 'screen.patientsearch.table.patientId',
        renderer: createCellRenderer('button', this.getData, {
          key: 'id',
          handler: this.handleGoToPatientScreen,
        }),
      },
      {
        key: 'organization',
        label: 'screen.patientsearch.table.organization',
        renderer: createCellRenderer('text', this.getData, { key: 'organization' }),
      },
      {
        key: 'lastName',
        label: 'screen.patientsearch.table.lastName',
        renderer: createCellRenderer('text', this.getData, { key: 'lastName' }),
      },
      {
        key: 'firstName',
        label: 'screen.patientsearch.table.firstName',
        renderer: createCellRenderer('text', this.getData, { key: 'firstName' }),
      },
      {
        key: 'gender',
        label: 'screen.patientsearch.table.gender',
        renderer: createCellRenderer('text', this.getData, { key: 'gender' }),
      },
      {
        key: 'dob',
        label: 'screen.patientsearch.table.dob',
        renderer: createCellRenderer('text', this.getData, { key: 'birthDate' }),
      },
      {
        key: 'practitioner',
        label: 'screen.patientsearch.table.practitioner',
        renderer: createCellRenderer('text', this.getData, { key: 'practitioner' }),
      },
      {
        key: 'test',
        label: 'screen.patientsearch.table.test',
        renderer: createCellRenderer('text', this.getData, { key: 'test' }),
      },
      {
        key: 'prescription',
        label: 'screen.patientsearch.table.prescription',
        renderer: createCellRenderer('text', this.getData, { key: 'prescription' }),
      },
      {
        key: 'mrn',
        label: 'screen.patientsearch.table.mrn',
        renderer: createCellRenderer('text', this.getData, { key: 'mrn' }),
      },
      {
        key: 'ramq',
        label: 'screen.patientsearch.table.ramq',
        renderer: createCellRenderer('text', this.getData, { key: 'ramq' }),
      },
      {
        key: 'position',
        label: 'screen.patientsearch.table.position',
        renderer: createCellRenderer('text', this.getData, { key: 'position' }),
      },
      {
        key: 'familyId',
        label: 'screen.patientsearch.table.familyId',
        renderer: createCellRenderer('text', this.getData, { key: 'familyId' }),
      },
      {
        key: 'familyType',
        label: 'screen.patientsearch.table.familyType',
        renderer: createCellRenderer('text', this.getData, { key: 'familyType' }),
      },
      {
        key: 'ethnicity',
        label: 'screen.patientsearch.table.ethnicity',
        renderer: createCellRenderer('text', this.getData, { key: 'ethnicity' }),
      },
      {
        key: 'bloodRelationship',
        label: 'screen.patientsearch.table.bloodRelationship',
        renderer: createCellRenderer('text', this.getData, { key: 'bloodRelationship' }),
      },
      {
        key: 'request',
        label: 'screen.patientsearch.table.request',
        renderer: createCellRenderer('text', this.getData, { key: 'request' }),
      },
    ];
    this.state.facetFilterOpen = Array(this.columnPreset.length).fill(false);
  }

  static getDerivedStateFromProps(nextProps, state) {
    const searchType = nextProps.search.lastSearchType || 'patient';
    if (!nextProps.search[searchType].results) {
      return null;
    }

    const getStatusLabel = (request) => {
      if (request.status === 'on-hold' && !request.submitted) {
        return intl.get('screen.patientsearch.status.incomplete');
      }
      return intl.get(`screen.patientsearch.status.${request.status}`);
    };
    if (searchType !== 'autocomplete') {
      const data = nextProps.search[searchType].results.map((result) => {
        const organizationValue = () => {
          if (result.organization.name === '') {
            return result.organization.id.split('/')[1];
          }
          return result.organization.name;
        };
        const value = {
          status: getStatusLabel(result),
          id: result.id,
          mrn: result.mrn,
          ramq: result.ramq,
          organization: organizationValue(),
          firstName: result.firstName,
          lastName: result.lastName.toUpperCase(),
          gender: intl.get(`screen.patientsearch.${result.gender.toLowerCase()}`),
          birthDate: result.birthDate,
          familyId: result.familyId,
          familyComposition: '',
          familyType: result.familyType,
          ethnicity: result.ethnicity,
          bloodRelationship: result.bloodRelationship,
          proband: result.proband,
          position: result.position,
          practitioner: result.id.startsWith('PA') ? `${result.practitioner.lastName.toUpperCase()}, ${result.practitioner.firstName}` : 'FERRETTI, Vincent',
          request: result.request,
          test: result.test,
          prescription: result.prescription,
        };

        Object.keys(value).forEach((key) => {
          if (value[key] == null || value[key].length === 0) {
            value[key] = 'N/A';
          }
        });

        return value;
      });

      return {
        data,
        page: nextProps.search[searchType].page,
        size: nextProps.search[searchType].pageSize,
      };
    }

    return state;
  }

  getData() {
    const { data } = this.state;
    return data;
  }

  getValue(type) {
    const { data } = this.state;
    let value = [];
    if (type === 'practitioner') {
      data.map((d) => (
        !value.includes(d.practitioner) ? value.push(d.practitioner) : null
      ));
    } else if (type === 'status') {
      data.map((d) => (
        !value.includes(d.status) ? value.push(d.status) : null
      ));
    } else if (type === 'familyComposition') {
      value = ['solo', 'duo', 'trio'];
    } else if (type === 'position') {
      value = ['Proband', 'Parent'];
    } else if (type === 'organization') {
      data.map((d) => (
        !value.includes(d.organization) ? value.push(d.organization) : null
      ));
    }

    return value;
  }

  handleCategoriesOpenChange(e) {
    this.setState({
      facetFilterOpen: e,
    });
  }

  handleAutoCompletePressEnter(e) {
    const { size } = this.state;
    const { actions } = this.props;
    const query = e.currentTarget.attributes.value.nodeValue;
    this.setState({
      page: 1,
    });

    if (!query || query.length < 1) {
      actions.searchPatientsByQuery({}, 1, size);
    } else {
      actions.autoCompletePatients('complete', query, 1, size);
    }
  }

  handlePageChange(page, size) {
    const { actions, search } = this.props;
    this.setState({
      page,
    });

    if (search.lastSearchType === 'autocomplete') {
      actions.autoCompletePatients('partial', search.autocomplete.query, page, size);
    } else {
      actions.searchPatientsByQuery(search.patient.query, page, size);
    }
  }

  handleColumnsUpdated(columns) {
    if (columns != null) {
      const { actions } = this.props;
      actions.updateUserColumns(columns);
    }
  }

  handleColumnsOrderUpdated(columns) {
    if (columns != null) {
      const { actions } = this.props;
      actions.updateUserColumnsOrder(columns);
    }
  }

  handleColumnsReset() {
    const { actions } = this.props;
    actions.updateUserColumnsReset();
  }

  handlePageSizeChange(size) {
    const { actions, search } = this.props;
    const { page } = this.state;
    this.setState({
      size,
    });

    if (search.lastSearchType === 'autocomplete') {
      actions.autoCompletePatients('partial', search.autocomplete.query, page, size);
    } else {
      actions.searchPatientsByQuery(search.patient.query, page, size);
    }
  }

  handleOpenFacet() {
    const { isFacetOpen, columnsWidth } = this.state;

    this.setState({
      isFacetOpen: !isFacetOpen,
      columnsWidth: columnsWidth || 120,
    });
  }

  handleAutoCompleteChange(query) {
    const { actions } = this.props;
    const { size } = this.state;
    if (query && query.length > 0) {
      actions.autoCompletePatients('partial', query, 1, size);
      this.setState({
        page: 1,
      });
    } else {
      this.setState({
        page: 1,
      });
      actions.autoCompletePatients('partial', null, 1, size);
      actions.searchPatientsByQuery(null, 1, size);
    }
  }

  handleAutoCompleteSelect(value) {
    const { actions } = this.props;
    const patientId = value.split(' ')[0] || null;
    if (patientId) {
      actions.autoCompletePatientsSelected();
      actions.navigateToPatientScreen(patientId);
    }
  }

  handleGoToPatientScreen(e) {
    const { actions } = this.props;
    const value = e.currentTarget.getAttribute('data-id');
    actions.navigateToPatientScreen(value);
  }

  handleGotoSubmissionPage() {
    const { actions } = this.props;
    actions.navigateToSubmissionScreen();
  }

  exportToTsv() {
    const { page, size, data } = this.state;
    const { search } = this.props;
    const { lastSearchType } = search;
    const pages = Math.ceil((search[lastSearchType].total / size));
    const filename = `${lastSearchType}_${page}of${pages}`;
    const csvExporter = new ExportToCsv({
      filename,
      fieldSeparator: '\t',
      showLabels: true,
      useKeysAsHeaders: true,
    });

    csvExporter.generateCsv(data);
  }

  isCategorieFacetOpen(index) {
    const { facetFilterOpen } = this.state;
    return !!facetFilterOpen.includes(index);
  }

  render() {
    const {
      app, search, defaultColumns, defaultColumnsOrder,
    } = this.props;
    const { patient } = search;
    const { total } = patient;
    const { showSubloadingAnimation } = app;
    const {
      size, page, isFacetOpen, facet,
    } = this.state;

    const { Title } = Typography;
    const { SubMenu } = Menu;
    const placeholderText = intl.get('screen.patientsearch.placeholder');
    const selectAll = intl.get('screen.patientvariant.filter.selection.all');
    const selectNone = intl.get('screen.patientvariant.filter.selection.none');

    const rowHeights = Array(size).fill(36);
    const autoCompleteResults = search.autocomplete.results.map((result) => ({
      value: result.id,
      text: (
        <>
          <Row className="autocomplete-row">
            <Col>
              <Typography.Text className="autocomplete-row__name">
                { result.firstName.toUpperCase() } { result.lastName }
              </Typography.Text>
            </Col>
            <Col>
              <Typography.Text className="autocomplete-row__mrn">
                { intl.get('screen.patientsearch.table.mrn') }: { result.mrn }
              </Typography.Text>
            </Col>
          </Row>
        </>
      ),
    }));

    return (
      <Layout>
        <Card className="patientSearch">
          <Row>
            <Col span={24}>
              <Title level={3}>{ intl.get('screen.patientsearch.title') }</Title>
            </Col>
          </Row>
          <Row justify="space-between" className="flex-row searchNav">
            <Col>
              <Button className={isFacetOpen ? 'facet openFacet' : 'facet'} onClick={this.handleOpenFacet}>
                <div>
                  <IconKit className="btnIcon" size={16} icon={ic_tune} />
                  { intl.get('screen.patientsearch.filter') }
                </div>
                { isFacetOpen && (
                  <IconKit className="btnClose" size={16} icon={ic_close} />
                ) }
              </Button>
            </Col>
            <Col className="autoSearch">
              <AutoComplete
                style={{ width: '100%' }}
                allowClear
                autoFocus
                defaultActiveFirstOption={false}
                dataSource={autoCompleteResults}
                onChange={this.handleAutoCompleteChange}
                onSelect={this.handleAutoCompleteSelect}
                onBlur={this.handleAutoCompleteClose}
                className="autocomplete"
              >
                <Input
                  prefix={
                    <SearchOutlined />
                  }
                  placeholder={placeholderText}
                  onPressEnter={this.handleAutoCompletePressEnter}
                />
              </AutoComplete>
            </Col>
            <Col>
              <Button className={`${style.btnPrimary} ${style.btn}`} onClick={this.handleGotoSubmissionPage}>
                <IconKit size={16} icon={ic_add} />
                { intl.get('screen.patientsearch.button.new') }
              </Button>
            </Col>
          </Row>
          <Row className="flex-row">
            { isFacetOpen && (
              <Col className={isFacetOpen ? 'openFacet' : 'closeFacet'}>
                <Menu
                  onClick={this.handleClick}
                  mode="inline"
                  className="menuCaterogy"
                  onOpenChange={this.handleCategoriesOpenChange}
                >{
                    facet.map((type) => (
                      <SubMenu
                        className="category"
                        key={type}
                        title={(
                          <span className="subMenuTitle">
                            <IconKit size={24} icon={this.isCategorieFacetOpen(type) ? ic_keyboard_arrow_down : ic_keyboard_arrow_right} className="iconRightArrowDropDown" />
                            <div className="titleName">
                              <span className="value">{ intl.get(`screen.patientsearch.table.${type}`) }</span>
                              {
                                this.isCategorieFacetOpen(type) ? (
                                  <Button className="iconSearch" onClick={this.handleInputView}>
                                    <IconKit size={24} icon={ic_search} />
                                  </Button>
                                ) : null
                              }

                            </div>
                          </span>
                        )}
                      >
                        <Card bordered={false}>
                          <Row className="selectionToolBar">
                            <Button onClick={this.handleSelectAll}>{ selectAll }</Button>
                            <Divider type="vertical" />
                            <Button onClick={this.handleSelectNone}>{ selectNone }</Button>
                          </Row>
                          <Row>
                            <Col span={24}>
                              <Checkbox.Group className="checkboxGroup" onChange={this.handleSelectionChange}>
                                { this.getValue(type).map((option) => (
                                  <Row>
                                    <Col>
                                      <Checkbox className="checkboxLabel" value={option}><span className="checkboxValue">{ option }</span></Checkbox>
                                    </Col>
                                  </Row>
                                )) }
                              </Checkbox.Group>
                            </Col>
                          </Row>
                        </Card>
                      </SubMenu>
                    ))
                  }
                </Menu>
              </Col>
            ) }
            <Col className={isFacetOpen ? 'table table-facet' : 'table'}>
              <Card bordered={false} className="tablePatient">
                { defaultColumns != null && (
                  <InteractiveTable
                    key="patient-interactive-table"
                    size={size}
                    page={page}
                    total={total}
                    defaultVisibleColumns={defaultColumns}
                    defaultColumnsOrder={defaultColumnsOrder}
                    schema={this.columnPreset}
                    columnWidth={this.columnPreset.map((c) => c.columnWidth)}
                    pageChangeCallback={this.handlePageChange}
                    pageSizeChangeCallback={this.handlePageSizeChange}
                    exportCallback={this.exportToTsv}
                    numFrozenColumns={1}
                    isLoading={showSubloadingAnimation}
                    rowHeights={rowHeights}
                    columnsUpdated={this.handleColumnsUpdated}
                    columnsOrderUpdated={this.handleColumnsOrderUpdated}
                    columnsReset={this.handleColumnsReset}
                  />
                ) }
              </Card>
            </Col>
          </Row>
        </Card>
      </Layout>
    );
  }
}

PatientSearchScreen.propTypes = {
  app: PropTypes.shape(appShape).isRequired,
  search: PropTypes.shape(searchShape).isRequired,
  actions: PropTypes.shape({}).isRequired,
  defaultColumns: PropTypes.array.isRequired,
  defaultColumnsOrder: PropTypes.array.isRequired,
};

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators({
    navigateToPatientScreen,
    navigateToSubmissionScreen,
    autoCompletePatients,
    searchPatientsByQuery,
    autoCompletePatientsSelected,
    updateUserColumns,
    updateUserColumnsOrder,
    updateUserColumnsReset,
  }, dispatch),
});

const mapStateToProps = (state) => ({
  app: state.app,
  search: state.search,
  defaultColumns: state.search.columns,
  defaultColumnsOrder: state.search.columnsOrder,
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(PatientSearchScreen);
