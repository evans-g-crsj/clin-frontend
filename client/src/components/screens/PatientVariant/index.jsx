import React from 'react';
import shortid from 'shortid';
import PropTypes from 'prop-types';
import intl from 'react-intl-universal';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import cloneDeep from 'lodash/cloneDeep';
import curry from 'lodash/curry';
import curryRight from 'lodash/curryRight';
import filter from 'lodash/filter';
import findIndex from 'lodash/findIndex';
import get from 'lodash/get';
import has from 'lodash/has';
import isNil from 'lodash/isNil';
import {
  Badge, Button, Card, Checkbox, Col, notification, Row, Tabs,
} from 'antd';
import { LinesBuilder } from '../../../helpers/excel/LinesBuilder';

import HeaderCellWithTooltip from '../../Table/HeaderCellWithTooltip';
import HeaderCustomCell from '../../Table/HeaderCustomCell';

import { createCellRenderer } from '../../Table/index';
import InteractiveTable from '../../Table/InteractiveTable';
import VariantNavigation from './components/VariantNavigation';
import Autocompleter, { tokenizeObjectByKeys } from '../../../helpers/autocompleter';
import exportToExcel from '../../../helpers/excel/export';
import EmptyCard from './components/EmptyCard';

import { appShape } from '../../../reducers/app';
import { variantShape } from '../../../reducers/variant';
import Statement from '../../Query/Statement';
import {
  commitHistory,
  countVariants,
  createDraftStatement,
  createStatement,
  deleteStatement,
  createQuery,
  duplicateQuery,
  duplicateStatement,
  fetchSchema,
  getStatements,
  removeQuery,
  replaceQueries,
  replaceQuery,
  searchVariants,
  selectQuery,
  selectStatement,
  sortStatement,
  undo,
  updateStatement,
  resetColumns,
  updateVariantColumns,
  updateVariantColumnsOrder,
} from '../../../actions/variant';
import { updateUserProfile } from '../../../actions/user';
import { navigateToPatientScreen, navigateToVariantDetailsScreen } from '../../../actions/router';

import './style.scss';
import style from './style.module.scss';
import { userShape } from '../../../reducers/user';

const VARIANT_TAB = 'VARIANTS';
const GENE_TAB = 'GENES';

const PAGE_SIZE_OPTIONS = ['15', '25', '50', '100', '200'];

const COLUMN_WIDTHS = {
  MUTATION_ID: 200,
  TYPE: 100,
  DBSNP: 120,
  CONSEQUENCES: 230,
  EXOMISER: 100,
  CLINVAR: 160,
  CADD: 90,
  FREQUENCIES: 120,
  GNOMAD: 120,
  ZYGOSITY: 90,
  SEQ: 80,
  DEFAULT: 150,
  TINY: 52,
};

const getValue = curryRight(get)('');
const valuePresent = (x) => (!isNil(x) && x !== '');
const insertCR = (lines) => lines.flatMap((l) => [...l, '\n']);
const getPredictionValue = (letter) => {
  switch (letter.toUpperCase()) {
    case 'D':
      return intl.get('variant.report.deleterious');
    case 'T':
      return intl.get('variant.report.tolerated');
    default:
      return '';
  }
};

/**
 * Cell generator for Nucleotidic variation column
 * @param {*} variant
 * @param {*} gene
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const nucleotidicVariation = (variant, _gene) => {
  const builder = new LinesBuilder();
  builder.append(variant.hgvsg);

  builder.append(variant.name);
  const symbols = get(variant, 'genes_symbol', []);
  if (symbols.length > 0) {
    builder.append(`${intl.get('variant.report.gene')}: `, {
      bold: true,
      value: symbols.join(', '),
    },
    {
      bold: false,
    });
  }

  for (let i = 0; i < variant.consequences.length; i += 1) {
    const consequence = variant.consequences[i];
    if (consequence.coding_dna_change != null || consequence.aa_change != null) {
      builder.newLine();
      builder.append(`REF_SEQ_ID_${i}`);

      builder.append(consequence.coding_dna_change);
      builder.append(consequence.aa_change);
    }
  }
  return builder.build();
};

/**
 * Cell generator for parental origin column
 * @param {*} variant
 * @param {*} gene
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const parentalOriginLines = (variant, _gene) => {
  const zygosity = (donor) => {
    const zygoCode = (d) => getValue(d, 'zygosity');
    return zygoCode(donor) === 'HOM'
      ? intl.get('screen.variantDetails.homozygote')
      : intl.get('screen.variantDetails.heterozygote');
  };

  const coverage = (donor) => {
    const adAlt = getValue(donor, 'ad_alt');
    const adTotal = getValue(donor, 'ad_total');

    return [
      intl.get('screen.patientvariant.parentalOrigin.variantConverage'),
      `${adAlt}/${adTotal} ${intl.get('screen.patientvariant.parentalOrigin.sequenceReads')}`,
    ];
  };

  const origin = (d) => {
    switch (d.origin) {
      case 'FTH':
        return `(${intl.get('screen.patientvariant.header.family.father')})`;
      case 'MTH':
        return `(${intl.get('screen.patientvariant.header.family.mother')})`;
      default:
        return '(-)';
    }
  };
  const parentalOriginForDonor = (d) => [zygosity(d), origin(d), ...coverage(d)];
  return insertCR(variant.donors.flatMap(parentalOriginForDonor).filter(valuePresent));
};

/**
 * Cell generator for allelic frequency column
 * @param {*} variant
 * @param {*} gene
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const allelicFrequency = (variant, _gene) => {
  if (has(variant, 'frequencies.exac')) {
    return getValue(variant.frequencies.exac, 'af');
  }

  if (has(variant, 'frequencies.gnomad_genomes_3_0')) {
    return getValue(variant.frequencies.gnomad_genomes_3_0, 'af');
  }

  if (has(variant, 'variant.frequencies.gnomad_genomes_2_1_1')) {
    return getValue(variant.frequencies.gnomad_genomes_2_1_1, 'af');
  }

  return 0;
};

/**
 * Cell generator for in silico predictions (Sift) column
 * @param {*} variant
 * @param {*} gene
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const inSilicoPredictions = (variant, _gene) => {
  const preds = variant.consequences
    .map((c) => (c.predictions ? c.predictions.sift_pred : null))
    .filter(valuePresent);

  return preds.length > 0 ? `${getPredictionValue(preds[0])}` : '';
};

/**
 * Cell generator for Clinvar column
 * @param {*} variant
 * @param {*} gene
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const clinVar = (variant, _gene) => {
  if (!variant.clinvar) {
    return 0;
  }

  const clinvarLabel = intl.get(`clinvar.value.${getValue(variant.clinvar, 'clinvar_clinsig')}`);
  const clinvarId = getValue(variant.clinvar, 'clinvar_id');
  const cvcs = `${clinvarLabel} (${intl.get('screen.patientvariant.clinVarVariationId')}: ${clinvarId})`;
  return cvcs || 0;
};

const cleanOmimValue = (value) => {
  if (!value) {
    return '';
  }
  let output = value.trim();
  if (output[0] === '{') {
    output = output.substr(1);
  }
  if (output[output.length - 1] === '}') {
    output = output.substr(0, output.length - 1);
  }
  return output;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const omimVar = (_variant, gene) => {
  try {
    const omims = gene.omim.map((omim) => {
      let output = `- ${cleanOmimValue(omim.name)} MIM${omim.omim_id}`;
      if (get(omim, 'inheritance', []).length > 0) {
        output = `${output} (${omim.inheritance.join(', ')})`;
      }
      return output;
    });

    return omims.join('\n');
  } catch (e) {
    return '';
  }
};

const reportSchema = () => [
  {
    header: intl.get('variant.report.header_value.Nucleotidic_variation_GRChv38'),
    type: 'string',
    cellGenerator: nucleotidicVariation,
  },
  {
    header: intl.get('variant.report.header_value.Parental_origin'),
    type: 'string',
    cellGenerator: parentalOriginLines,
  },
  {
    header: intl.get('variant.report.header_value.Allelic_frequency'),
    type: 'string',
    cellGenerator: allelicFrequency,
  },
  {
    header: intl.get('variant.report.header_value.Prediction_in_silico_sift'),
    type: 'string',
    cellGenerator: inSilicoPredictions,
  },
  {
    header: intl.get('variant.report.header_value.ClinVar'),
    type: 'string',
    cellGenerator: clinVar,
  },
  {
    header: intl.get('variant.report.header_value.omim'),
    type: 'string',
    cellGenerator: omimVar,
  },
];

const showNotification = (message, description) => {
  notification.open({
    message,
    description,
    onClick: () => { },
  });
};

const formatConsequences = (consequences) => consequences.map((consequence) => consequence);

class PatientVariantScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: VARIANT_TAB,
      page: 1,
      size: 15,
    };
    this.handleQuerySelection = this.handleQuerySelection.bind(this);
    this.handleQueryChange = this.handleQueryChange.bind(this);
    this.handleQueriesChange = this.handleQueriesChange.bind(this);
    this.handleQueriesRemoval = this.handleQueriesRemoval.bind(this);
    this.handleQueryDuplication = this.handleQueryDuplication.bind(this);
    this.handleStatementSort = this.handleStatementSort.bind(this);
    this.handleCommitHistory = this.handleCommitHistory.bind(this);
    this.handleDraftHistoryUndo = this.handleDraftHistoryUndo.bind(this);
    this.handleTabChange = this.handleTabChange.bind(this);
    this.handleColumnVisibilityChange = this.handleColumnVisibilityChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handlePageSizeChange = this.handlePageSizeChange.bind(this);
    this.handleNavigationToPatientScreen = this.handleNavigationToPatientScreen.bind(this);
    this.handleGetStatements = this.handleGetStatements.bind(this);
    this.handleCreateDraftStatement = this.handleCreateDraftStatement.bind(this);
    this.handleUpdateStatement = this.handleUpdateStatement.bind(this);
    this.handleDeleteStatement = this.handleDeleteStatement.bind(this);
    this.handleSelectStatement = this.handleSelectStatement.bind(this);
    this.handleDuplicateStatement = this.handleDuplicateStatement.bind(this);
    this.handleSetDefaultStatement = this.handleSetDefaultStatement.bind(this);
    this.handleNavigationToVariantDetailsScreen = this.handleNavigationToVariantDetailsScreen.bind(this);
    this.getData = this.getData.bind(this);
    this.getRowHeights = this.getRowHeights.bind(this);
    this.getImpactTag = this.getImpactTag.bind(this);
    this.goToVariantPatientTab = this.goToVariantPatientTab.bind(this);
    this.handleSelectVariant = this.handleSelectVariant.bind(this);
    this.handleCreateReport = this.handleCreateReport.bind(this);
    this.onVariantColumnWidthChanged = this.onVariantColumnWidthChanged.bind(this);
    this.handleColumnsUpdated = this.handleColumnsUpdated.bind(this);
    this.handleColumnsOrderUpdated = this.handleColumnsOrderUpdated.bind(this);
    this.handleColumnsReset = this.handleColumnsReset.bind(this);

    this.state.selectedVariants = {};

    // @NOTE Initialize Component State
    this.state.columnPreset = {
      [VARIANT_TAB]: [
        {
          key: 'someKey',
          label: 'screen.variantsearch.table.select',
          renderer: createCellRenderer('custom', this.getData, {
            // key: 'mutationId',
            handler: this.handleSelectVariant,
            renderer: (data) => {
              try {
                const {
                  selectedVariants,
                } = this.state;
                return (
                  <Checkbox
                    className="checkbox"
                    id={data.id}
                    onChange={this.handleSelectVariant}
                    checked={!!selectedVariants[data.id]}
                  />
                );
              } catch (e) {
                return '';
              }
            },
          }),
          excelRenderer: (data) => { try { return data.hgvsg; } catch (e) { return ''; } },
          columnWidth: COLUMN_WIDTHS.TINY,
          headerRenderer: () => {
            const fullData = this.getData();
            const {
              selectedVariants,
            } = this.state;
            const isChecked = fullData && fullData.length === Object.keys(selectedVariants).length;
            return (
              <HeaderCustomCell className="table__header__checkbox__wrapper">
                <Checkbox
                  aria-label="Select All Variants"
                  checked={isChecked}
                  onClick={() => {
                    if (isChecked) {
                      this.setState({
                        selectedVariants: {},
                      });
                    } else {
                      this.setState({
                        selectedVariants: fullData.reduce((acc, currentData) => ({
                          ...acc,
                          [currentData.id]: currentData,
                        }), {}),
                      });
                    }
                  }}
                />
              </HeaderCustomCell>
            );
          },
        },
        {
          key: 'id',
          label: 'screen.variantsearch.table.variant',
          renderer: createCellRenderer('custom', this.getData, {
            renderer: (data) => {
              try {
                return (
                  <Button
                    data-id={data.id}
                    onClick={this.handleNavigationToVariantDetailsScreen}
                    className="button"
                  >
                    { data.hgvsg }
                  </Button>
                );
              } catch (e) { return ''; }
            },
          }),
          excelRenderer: (data) => { try { return data.hgvsg; } catch (e) { return ''; } },
          columnWidth: COLUMN_WIDTHS.MUTATION_ID,
        },
        {
          key: 'type',
          label: 'screen.variantsearch.table.variantType',
          renderer: createCellRenderer('capitalText', this.getData, {
            key: 'variant_class',
            renderer: (data) => {
              try {
                return data.variant_class;
              } catch (e) { return ''; }
            },
          }),
          excelRenderer: (data) => { try { return data.variant_class; } catch (e) { return ''; } },
          columnWidth: COLUMN_WIDTHS.TYPE,
        },
        {
          key: 'dbsnp',
          label: 'screen.variantsearch.table.dbsnp',
          renderer: createCellRenderer('custom', this.getData, {
            renderer: (data) => {
              try {
                return (
                  <a
                    href={`https://www.ncbi.nlm.nih.gov/snp/${data.dbsnp}`}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="link, dbsnp"
                  >
                    { data.dbsnp }
                  </a>
                );
              } catch (e) { return ''; }
            },
          }),
          excelRenderer: (data) => { try { return data.dbsnp; } catch (e) { return ''; } },
          columnWidth: COLUMN_WIDTHS.DBSNP,
        },
        {
          key: 'consequences',
          label: 'screen.variantsearch.table.consequences',
          renderer: createCellRenderer('custom', this.getData, {
            renderer: (data) => {
              try {
                const consequences = formatConsequences(data.consequences);
                return (
                  <div>
                    {
                      consequences.map((consequence) => (
                        consequence.pick === true ? (
                          <Row className="consequences" key={shortid.generate()}>
                            <Col>{ this.getImpactTag(consequence.impact) }</Col>
                            <Col className="consequence">{ consequence.consequence.join(' ') }</Col>
                            <Col>
                              <a
                                href={`https://useast.ensembl.org/Homo_sapiens/Gene/Summary?g=${consequence.symbol}`}
                                rel="noopener noreferrer"
                                target="_blank"
                                className="link"
                              >
                                { consequence.symbol ? consequence.symbol : '' }
                              </a>
                            </Col>
                            <Col>{ consequence.aa_change ? consequence.aa_change : '' }</Col>
                          </Row>
                        ) : null
                      ))
                    }
                  </div>
                );
              } catch (e) { return ''; }
            },
          }),
          excelRenderer: (data) => {
            try {
              const consequences = formatConsequences(data.consequences);
              return consequences.map((c) => (c.pick === true
                ? `${c.consequence[0]} ${c.symbol ? c.symbol : ''} ${c.aa_change ? c.aa_change : ''}`
                : ''));
            } catch (e) { return ''; }
          },
          columnWidth: COLUMN_WIDTHS.CONSEQUENCES,
        },
        {
          key: 'clinvar',
          label: 'screen.variantsearch.table.clinvar',
          renderer: createCellRenderer('custom', this.getData, {
            renderer: (data) => {
              try {
                return (
                  <div className="clinvar">
                    <Row>{ data.clinvar.clin_sig.join(', ') }</Row>
                    <Row>
                      <a
                        href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${data.clinvar.clinvar_id}/`}
                        rel="noopener noreferrer"
                        target="_blank"
                        className="link"
                      >
                        { data.clinvar.clinvar_id }
                      </a>
                    </Row>
                  </div>
                );
              } catch (e) { return ''; }
            },
          }),
          excelRenderer: (data) => {
            try {
              return `${data.clinvar.clin_sig}\n${data.clinvar.clinvar_id}`;
            } catch (e) { return ''; }
          },
          columnWidth: COLUMN_WIDTHS.CLINVAR,
        },
        {
          key: 'cadd',
          label: 'screen.variantsearch.table.cadd',
          renderer: createCellRenderer('custom', this.getData, {
            renderer: (data) => {
              try {
                return data.consequences
                  .filter((consequence) => consequence.pick === true && has(consequence, 'predictions.cadd_score'))
                  .map((consequence) => <Row id={shortid()}>{ consequence.predictions.cadd_score }</Row>);
              } catch (e) { return ''; }
            },
          }),
          excelRenderer: (data) => {
            try {
              return data.consequences
                .filter((consequence) => consequence.pick === true && has(consequence, 'predictions.cadd_score'))
                .map((consequence) => (`${consequence.predictions.cadd_score}`))
                .join('\n');
            } catch (e) { return ''; }
          },
          columnWidth: COLUMN_WIDTHS.CADD,
        },
        {
          key: 'frequencies',
          label: 'screen.variantsearch.table.frequencies',
          description: '',
          renderer: createCellRenderer('custom', this.getData, {
            renderer: (data) => {
              try {
                return (
                  <>
                    <Row className="frequenciesLine">
                      <Button
                        type="link"
                        className="frequenciesLink"
                        data-id={data.id}
                        onClick={this.goToVariantPatientTab}
                      >
                        { data.frequencies.internal.ac }
                      </Button>
                      <span> / </span>
                      { data.frequencies.internal.an }
                    </Row>
                  </>
                );
              } catch (e) { return ''; }
            },
          }),
          excelRenderer: (data) => {
            try {
              return `${data.frequencies.internal.ac} / ${data.frequencies.internal.an}`;
            } catch (e) { return ''; }
          },
          columnWidth: COLUMN_WIDTHS.FREQUENCIES,
          headerRenderer: () => (
            <div>
              <HeaderCellWithTooltip
                name={intl.get('screen.variantsearch.table.frequencies')}
                description=""
              />
            </div>
          )
          ,
        },
        {
          key: 'gnomAD',
          label: 'screen.variantsearch.table.gnomAd',
          renderer: createCellRenderer('custom', this.getData, {
            renderer: (data) => {
              try {
                return (
                  <>
                    <Row>
                      <a
                        // eslint-disable-next-line max-len
                        href={`https://gnomad.broadinstitute.org/variant/${data.chromosome}-${data.start}-${data.reference}-${data.alternate}?dataset=gnomad_r3`}
                        rel="noopener noreferrer"
                        target="_blank"
                        className="link"
                      >
                        { data.frequencies.gnomad_genomes_3_0.af.toFixed(4) }
                      </a>
                    </Row>
                  </>
                );
              } catch (e) { return ''; }
            },
          }),
          excelRenderer: (data) => {
            try {
              return `${data.frequencies.gnomad_genomes_3_0.af.toExponential()}`;
            } catch (e) { return ''; }
          },
          columnWidth: COLUMN_WIDTHS.GNOMAD,
        },
        {
          key: 'zygosity',
          label: 'screen.variantsearch.table.zygosity',
          renderer: createCellRenderer('custom', this.getData, {
            renderer: (data) => {
              const { variant } = this.props;
              const donorIndex = findIndex(data.donors, { patient_id: variant.activePatient });
              try {
                return (
                  <>
                    <Row>{ data.donors[donorIndex].zygosity }</Row>
                  </>
                );
              } catch (e) { return ''; }
            },
          }),
          excelRenderer: (data) => {
            const { variant } = this.props;
            const donorIndex = findIndex(data.donors, { patient_id: variant.activePatient });
            try {
              return `${data.donors[donorIndex].zygosity}`;
            } catch (e) { return ''; }
          },
          columnWidth: COLUMN_WIDTHS.ZYGOSITY,
        },
        {
          key: 'seq',
          label: 'screen.variantsearch.table.seq',
          description: '',
          renderer: createCellRenderer('custom', this.getData, {
            renderer: (data) => {
              try {
                const { variant } = this.props;
                const donorIndex = findIndex(data.donors, { patient_id: variant.activePatient });
                return (
                  <>
                    <Row>{ data.donors[donorIndex].ad_alt }<span> / </span>{ data.donors[donorIndex].ad_total }</Row>
                  </>
                );
              } catch (e) { return ''; }
            },
          }),
          excelRenderer: (data) => {
            try {
              const { variant } = this.props;
              const donorIndex = findIndex(data.donors, { patient_id: variant.activePatient });
              return `${data.donors[donorIndex].ad_alt}/${data.donors[donorIndex].ad_total}`;
            } catch (e) { return ''; }
          },
          columnWidth: COLUMN_WIDTHS.SEQ,
          headerRenderer: () => (
            <div>
              <HeaderCellWithTooltip
                name={intl.get('screen.variantsearch.table.seq')}
                description=""
              />
            </div>
          ),
        },
        {
          key: 'pubmed',
          label: 'screen.variantsearch.table.pubmed',
          renderer: createCellRenderer('custom', this.getData, {
            renderer: (data) => {
              try {
                if (data.pubmed.length === 1) {
                  return (
                    <a
                      href={`https://www.ncbi.nlm.nih.gov/pubmed?term=${data.pubmed[0]}`}
                      rel="noopener noreferrer"
                      target="_blank"
                      className="link"
                    >
                      { `${data.pubmed.length} publication` }
                    </a>
                  );
                }

                return (
                  <a
                    href={`https://www.ncbi.nlm.nih.gov/pubmed?term=${data.pubmed.join('+')}`}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="link"
                  >
                    { `${data.pubmed.length} publications` }
                  </a>
                );
              } catch (e) { return ''; }
            },
          }),
          excelRenderer: (data) => {
            try {
              return data.pubmed.join(', ');
            } catch (e) { return ''; }
          },
          columnWidth: COLUMN_WIDTHS.DEFAULT,
        },
      ],
      [GENE_TAB]: [],
    };

    this.variantTableSelectedRegion = null;

    const { actions, variant } = props;
    const { schema } = variant;
    // @NOTE Make sure we have a schema defined in redux
    if (!schema.version) {
      actions.fetchSchema();
    }
  }

  componentDidMount() {
    this.handleGetStatements();
  }

  // eslint-disable-next-line class-methods-use-this
  getImpactTag(impact) {
    switch (impact) {
      case 'HIGH':
        return (
          <Badge className="impact" color="#f5646c" />
        );
      case 'MODERATE':
        return (
          <Badge className="impact" color="#ffa812" />
        );
      case 'LOW':
        return (
          <Badge className="impact" color="#52c41a" />
        );
      case 'MODIFIER':
        return (
          <Badge className="impact" color="#b5b5b5" />
        );
      default:
        return null;
    }
  }

  getRowHeights() {
    const data = this.getData();
    const { size } = this.state;
    const { variant } = this.props;
    const rowHeights = Array(data ? data.length : size).fill(32);
    if (data) {
      data.map((value, index) => {
        const donorIndex = findIndex(value.donors, { patientId: variant.activePatient });
        // const canonical = filter(value.consequences, { canonical: true });
        const pick = filter(value.consequences, { pick: true });
        const nbValue = pick.length;
        const singleRowHeight = 20;
        rowHeights[index] = nbValue <= 1 ? 32 : nbValue * singleRowHeight + 20;
        if (nbValue <= 1 && (value.clinvar || (value.donors[donorIndex] ? value.donors[donorIndex].transmission : null))) {
          rowHeights[index] = 2 * singleRowHeight + 20;
        }
        if (rowHeights[index] < singleRowHeight + 20) {
          rowHeights[index] = singleRowHeight + 20;
        }
        rowHeights[index] = rowHeights[index] === 40 ? 32 : rowHeights[index];
        return rowHeights;
      });
      return rowHeights;
    }
    return rowHeights;
  }

  getData() {
    const { currentTab } = this.state;
    if (currentTab === VARIANT_TAB) {
      const { variant } = this.props;
      const { activeQuery, results } = variant;
      return results[activeQuery];
    }
    return [];
  }

  getVariantData(mutationId) {
    const variants = this.getData().filter((v) => v.id === mutationId);
    return variants.length ? variants[0] : null;
  }

  goToVariantPatientTab(e) {
    const {
      actions,
    } = this.props;

    const mutationId = e.currentTarget.getAttribute('data-id');
    actions.navigateToVariantDetailsScreen(mutationId, 'patients');
  }

  handlePageChange(page, size) {
    const { patient, variant, actions } = this.props;
    const {
      draftQueries, activeQuery,
    } = variant;
    const { id } = patient.patient.parsed;

    this.setState({
      page,
    }, () => {
      actions.searchVariants(
        id,
        draftQueries,
        activeQuery,
        page,
        size,
      );
    });
  }

  handlePageSizeChange(size) {
    const { patient, variant, actions } = this.props;
    const {
      draftQueries, activeQuery,
    } = variant;
    const { page } = this.state;
    const { id } = patient.patient.parsed;

    this.setState({
      size,
    }, () => {
      actions.searchVariants(
        id,
        draftQueries,
        activeQuery,
        page,
        size,
      );
    });
  }

  handleQuerySelection(key) {
    const { actions } = this.props;
    this.setState({
      page: 1,
    }, () => {
      actions.selectQuery(key);
    });
  }

  handleQueryChange(query) {
    const { actions } = this.props;
    this.handleCommitHistory();
    this.setState({
      page: 1,
    }, () => {
      actions.replaceQuery(query.data || query);
    });
  }

  handleQueriesChange(queries) {
    const { actions } = this.props;
    this.handleCommitHistory();
    this.setState({
      page: 1,
    }, () => {
      actions.replaceQueries(queries);
    });
  }

  handleQueriesRemoval(keys) {
    const { actions } = this.props;
    this.handleCommitHistory();
    this.setState({
      page: 1,
    }, () => {
      actions.removeQuery(keys);
    });
  }

  handleQueryDuplication(initial, query, index) {
    const { actions, variant } = this.props;
    const { activeStatementTotals } = variant;
    this.handleCommitHistory();
    const resultForQuery = activeStatementTotals[initial.data.key];
    actions.duplicateQuery(query.data, index, resultForQuery);
    setTimeout(() => {
      this.handleQuerySelection(query.data.key);
    }, 100);
  }

  handleStatementSort(sortedQueries) {
    const { actions } = this.props;
    this.handleCommitHistory();
    actions.sortStatement(sortedQueries);
  }

  handleCommitHistory() {
    const { actions, variant } = this.props;
    const { draftQueries } = variant;
    actions.commitHistory(draftQueries);
  }

  handleDraftHistoryUndo() {
    const { actions } = this.props;
    actions.undo();
  }

  handleTabChange(key) {
    this.setState({
      currentTab: key,
    });
  }

  handleColumnVisibilityChange(checkedValues) {
    const { visibleColumns, currentTab } = this.state;
    visibleColumns[currentTab] = checkedValues;

    this.setState({
      visibleColumns,
    });
  }

  handleGetStatements() {
    const { actions } = this.props;
    actions.getStatements();
  }

  handleCreateDraftStatement(statement = {}) {
    const { actions } = this.props;
    actions.createDraftStatement(statement);
  }

  handleUpdateStatement(id, title, description, queries = null) {
    const { actions, variant } = this.props;
    const { statements } = variant;
    if (!queries) {
      queries = statements[id].queries; { /* eslint-disable-line */ }
    }
    if (id === 'draft') {
      actions.createStatement(id, title, description, queries);
    } else {
      actions.updateStatement(id, title, description, queries);
    }
  }

  handleDeleteStatement(id) {
    const { actions } = this.props;
    actions.deleteStatement(id);
  }

  handleDuplicateStatement(id) {
    const { actions } = this.props;
    actions.duplicateStatement(id);
  }

  handleSelectStatement(id) {
    const { actions } = this.props;
    actions.selectStatement(id);
  }

  handleSetDefaultStatement(id) {
    const { actions, user } = this.props;
    const { profile } = user;

    actions.updateUserProfile(profile.uid, id, profile.patientTableConfig, profile.variantTableConfig);
  }

  handleNavigationToPatientScreen(e) {
    const { actions } = this.props;
    actions.navigateToPatientScreen(e.currentTarget.attributes['data-patient-id'].nodeValue);
  }

  handleNavigationToVariantDetailsScreen(e) {
    const {
      actions,
    } = this.props;

    const mutationId = e.currentTarget.getAttribute('data-id');
    actions.navigateToVariantDetailsScreen(mutationId);
  }

  handleSelectVariant(event) {
    const {
      selectedVariants,
    } = this.state;
    const {
      target,
    } = event;

    const mutationId = target.id;

    const selection = cloneDeep(selectedVariants);
    if (selection[mutationId]) {
      delete selection[mutationId];
    } else {
      selection[mutationId] = this.getVariantData(mutationId);
    }

    this.setState({ selectedVariants: selection });
  }

  isReportAvailable() {
    const {
      selectedVariants,
    } = this.state;

    return Object.keys(selectedVariants).length > 0;
  }

  async handleCreateReport() {
    const {
      selectedVariants,
    } = this.state;

    const variants = Object.values(selectedVariants);

    const headerRow = reportSchema().map((h) => ({
      value: h.header, type: h.type,
    }));

    const reportRow = curry((variant, gene) => reportSchema().map((c) => ({
      type: c.type,
      value: c.cellGenerator(variant, gene),
    })));

    const variantRows = (variant) => variant.genes.map(reportRow(variant));
    const dataRows = variants.flatMap(variantRows);

    try {
      await exportToExcel('Rapport variants', headerRow, dataRows);
    } catch (e) {
      showNotification('Error', 'Could not create report');
    }
  }

  onVariantColumnWidthChanged(index, size) {
    const { columnPreset } = this.state;
    columnPreset[VARIANT_TAB][index].columnWidth = size;
    this.setState({ columnPreset });
  }

  handleColumnsUpdated(columns) {
    if (columns != null) {
      const { actions } = this.props;
      actions.updateVariantColumns(columns);
    }
  }

  handleColumnsOrderUpdated(columns) {
    if (columns != null) {
      const { actions } = this.props;
      actions.updateVariantColumnsOrder(columns);
    }
  }

  handleColumnsReset() {
    const { actions } = this.props;
    actions.resetColumns();
  }

  render() {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      app, variant, patient, user, defaultColumns, defaultColumnsOrder, actions,
    } = this.props;
    const { showSubloadingAnimation } = app;
    const {
      draftQueries, draftHistory, originalQueries, facets, schema, activeQuery,
      activeStatementId, activeStatementTotals, statements,
    } = variant;
    const {
      size, page, currentTab, columnPreset,
    } = this.state;
    const defaultStatementId = user.profile.defaultStatement ? user.profile.defaultStatement : null;
    const total = currentTab === VARIANT_TAB && activeStatementTotals[activeQuery] != null
      ? activeStatementTotals[activeQuery]
      : 0;

    const searchData = [];
    const reverseCategories = {};
    if (schema.categories) {
      schema.categories.forEach((category) => {
        searchData.push({
          id: category.id,
          subid: null,
          type: 'category',
          label: intl.get(`${category.label}`),
          data: category.filters ? category.filters.reduce((accumulator, clarify) => {
            const searcheableFacet = clarify.facet ? clarify.facet.map((facet) => {
              reverseCategories[facet.id] = category.id;
              return {
                id: facet.id,
                value: intl.get(`screen.patientvariant.${(!facet.label ? clarify.label : facet.label)}`),
              };
            }) : [];

            return accumulator.concat(searcheableFacet);
          }, []) : [],
        });
      });
    }

    /*
      This loop has been seen to take 70 ms to complete.
      This is something that will have to be addressed before going to prod alongside
      a more generalized performance problem:
      the whole cycle from setState to the end of rendering the page may take 360 ms on average.
    */
    if (facets[activeQuery]) {
      Object.keys(facets[activeQuery])
        .forEach((key) => {
          searchData.push({
            id: reverseCategories[key],
            subid: key,
            type: 'filter',
            label: intl.get(`screen.patientvariant.filter_${key}`),
            data: facets[activeQuery][key].map((value) => ({
              id: value.value,
              value: value.value,
              count: value.count,
            })),
          });
        });
    }

    const tokenizedSearchData = searchData.reduce((accumulator, group) => {
      if (group.data) {
        group.data.forEach((datum) => {
          accumulator.push({
            id: group.id,
            subid: group.subid || datum.id,
            type: group.type,
            label: group.label,
            value: datum.value,
            count: datum.count || null,
          });
        });
      }

      return accumulator;
    }, []);

    const searchDataTokenizer = tokenizeObjectByKeys();
    const autocomplete = Autocompleter(tokenizedSearchData, searchDataTokenizer);
    const rowHeights = this.getRowHeights();
    const reportAvailable = this.isReportAvailable();
    const asVariant = total > 0;
    if (asVariant) {
      return (
        <Card className="entity" bordered={false}>
          <VariantNavigation
            key="variant-navigation"
            className="variant-navigation"
            schema={schema}
            patient={patient}
            queries={draftQueries}
            activeQuery={activeQuery}
            data={facets[activeQuery] || {}}
            onEditCallback={this.handleQueryChange}
            searchData={searchData}
            autocomplete={autocomplete}
          />
          <Card bordered={false} className={`Content ${style.variantContent}`}>
            <Statement
              key="variant-statement"
              activeQuery={activeQuery}
              activeStatementId={activeStatementId}
              activeStatementTotals={activeStatementTotals}
              defaultStatementId={defaultStatementId}
              statements={statements}
              data={draftQueries}
              draftHistory={draftHistory}
              original={originalQueries}
              facets={facets}
              target={patient}
              categories={schema.categories}
              options={{
                copyable: true,
                duplicatable: true,
                editable: true,
                removable: true,
                reorderable: true,
                selectable: true,
                undoable: true,
              }}
              onSelectCallback={this.handleQuerySelection}
              onSortCallback={this.handleStatementSort}
              onEditCallback={this.handleQueryChange}
              onNewQueryCallback={() => actions.createQuery()}
              onBatchEditCallback={this.handleQueriesChange}
              onRemoveCallback={this.handleQueriesRemoval}
              onDuplicateCallback={this.handleQueryDuplication}
              onDraftHistoryUndoCallback={this.handleDraftHistoryUndo}
              onGetStatementsCallback={this.handleGetStatements}
              onCreateDraftStatementCallback={this.handleCreateDraftStatement}
              onUpdateStatementCallback={this.handleUpdateStatement}
              onDeleteStatementCallback={this.handleDeleteStatement}
              onSelectStatementCallback={this.handleSelectStatement}
              onDuplicateStatementCallback={this.handleDuplicateStatement}
              onSetDefaultStatementCallback={this.handleSetDefaultStatement}
              newCombinedQueryCallback={this.handleQuerySelection}
              searchData={searchData}
              externalData={patient}
            />
          </Card>
          <Card bordered={false} className={`Content ${style.variantTable}`}>
            <Tabs
              key="variant-interpreter-tabs"
              activeKey={currentTab}
              onChange={this.handleTabChange}
            >
              <Tabs.TabPane tab={`Variants (${total})`} key={VARIANT_TAB}>
                { currentTab === VARIANT_TAB && (
                  <InteractiveTable
                    key="variant-interactive-table"
                    isLoading={showSubloadingAnimation}
                    size={size}
                    page={page}
                    total={total}
                    totalLength={total}
                    sizeOptions={PAGE_SIZE_OPTIONS}
                    onColumnWidthChanged={this.onVariantColumnWidthChanged}
                    defaultVisibleColumns={defaultColumns}
                    defaultColumnsOrder={defaultColumnsOrder}
                    schema={columnPreset[VARIANT_TAB]}
                    pageChangeCallback={this.handlePageChange}
                    pageSizeChangeCallback={this.handlePageSizeChange}
                    createReportCallback={this.handleCreateReport}
                    columnsReset={this.handleColumnsReset}
                    columnsUpdated={this.handleColumnsUpdated}
                    columnsOrderUpdated={this.handleColumnsOrderUpdated}
                    isExportable={false}
                    canCreateReport
                    isReportAvailable={reportAvailable}
                    rowHeights={rowHeights}
                    numFrozenColumns={1}
                    getData={this.getData}
                  />
                ) }
              </Tabs.TabPane>
              <Tabs.TabPane tab="Genes" key={GENE_TAB} disabled>
                { currentTab === GENE_TAB && (
                  <InteractiveTable
                    key="gene-interactive-table"
                    isLoading={showSubloadingAnimation}
                    size={size}
                    page={page}
                    total={total}
                    totalLength={total}
                    sizeOptions={PAGE_SIZE_OPTIONS}
                    schema={columnPreset[GENE_TAB]}
                    pageChangeCallback={this.handlePageChange}
                    pageSizeChangeCallback={this.handlePageSizeChange}
                    isExportable={false}
                  />
                ) }
              </Tabs.TabPane>
            </Tabs>
          </Card>
        </Card>
      );
    }
    return (
      <EmptyCard />
    );
  }
}

PatientVariantScreen.propTypes = {
  app: PropTypes.shape(appShape).isRequired,
  user: PropTypes.shape(userShape).isRequired,
  patient: PropTypes.shape({}).isRequired,
  variant: PropTypes.shape(variantShape).isRequired,
  actions: PropTypes.shape({}).isRequired,
  defaultColumns: PropTypes.array.isRequired,
  defaultColumnsOrder: PropTypes.array.isRequired,
};

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators({
    fetchSchema,
    selectQuery,
    replaceQuery,
    createQuery,
    replaceQueries,
    removeQuery,
    duplicateQuery,
    sortStatement,
    searchVariants,
    countVariants,
    commitHistory,
    undo,
    navigateToPatientScreen,
    navigateToVariantDetailsScreen,
    getStatements,
    createDraftStatement,
    createStatement,
    updateStatement,
    deleteStatement,
    selectStatement,
    duplicateStatement,
    updateUserProfile,
    resetColumns,
    updateVariantColumns,
    updateVariantColumnsOrder,
  }, dispatch),
});

const mapStateToProps = (state) => ({
  app: state.app,
  user: state.user,
  patient: state.patient,
  variant: state.variant,
  defaultColumns: state.variant.columns,
  defaultColumnsOrder: state.variant.columnsOrder,
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(PatientVariantScreen);
