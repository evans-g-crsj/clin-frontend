import {
  Button, Checkbox,
} from 'antd';
import React, { useState } from 'react';
import intl from 'react-intl-universal';
import { useDispatch } from 'react-redux';
import { cloneDeep, find, findIndex } from 'lodash';
import moment from 'moment';

import { createCellRenderer } from '../../../Table/index';
import HeaderCustomCell from '../../../Table/HeaderCustomCell';
import { navigateToPatientScreen } from '../../../../actions/router';
import { PrescriptionData, PatientNanuqInformation } from '../../../../helpers/search/types';

import InteractiveTable from '../../../Table/InteractiveTable';
import PrescriptionTableHeader from './PrescriptionHeader';

interface Props {
  searchProps: any
  defaultVisibleColumns: string[]
  defaultColumnsOrder: { columnWidth: number, key: string, label: string }[]
  pageChangeCallback: (page: number, size: number) => void
  pageSizeChangeCallback: (size: number) => void
  exportCallback: () => void
  isLoading: boolean
  columnsUpdated: (columns: string[]) => void
  columnsOrderUpdated: (columns: any[]) => void
  columnsReset: () => void
  size: number
  page: number
  autocompleteResults: any
}

const PrescriptionTable: React.FC<Props> = ({
  searchProps,
  defaultVisibleColumns,
  defaultColumnsOrder,
  pageChangeCallback,
  pageSizeChangeCallback,
  isLoading,
  columnsUpdated,
  columnsOrderUpdated,
  columnsReset,
  page,
  size,
  autocompleteResults,
}) => {
  const [selectedPatients, setselectedPatients] = useState([] as PatientNanuqInformation[]);
  const { patient } = searchProps;
  const dispatch = useDispatch();
  const getStatusLabel = (req: any) => {
    if (req.status === 'on-hold' && !req.submitted) {
      return intl.get('screen.patientsearch.status.incomplete');
    }
    return intl.get(`screen.patientsearch.status.${req.status}`);
  };

  const results = autocompleteResults
    ? autocompleteResults.hits.map((element: any) => element._source)
    : patient.results.filter((result: any) => result != null && result.patientInfo != null);

  const handleGoToPatientScreen: any = (patientId: string, requestId: string | null = null) => {
    dispatch(navigateToPatientScreen(patientId, {
      tab: 'prescriptions',
      reload: null,
      openedPrescriptionId: requestId,
    }));
  };

  const output: any[] = [];
  if (results) {
    results.forEach((result: PrescriptionData) => {
      const value: any = {
        status: getStatusLabel(result),
        id: result.patientInfo.id,
        mrn: result.mrn ? result.mrn : '--',
        ramq: result.patientInfo.ramq,
        organization: result.patientInfo.organization.id.split('/')[1],
        firstName: result.patientInfo.firstName,
        lastName: result.patientInfo.lastName.toUpperCase(),
        gender: intl.get(`screen.patientsearch.${result.patientInfo.gender.toLowerCase()}`),
        birthDate: result.patientInfo.birthDate,
        familyId: result.familyInfo.id,
        familyComposition: result.familyInfo.type,
        familyType: result.familyInfo.type,
        ethnicity: result.ethnicity,
        bloodRelationship: (result.bloodRelationship == null)
          ? '--'
          : result.bloodRelationship
            ? intl.get('screen.patientsearch.bloodRelationship.yes')
            : intl.get('screen.patientsearch.bloodRelationship.no'),
        proband: 'Proband',
        position: result.patientInfo.position,
        practitioner: result.practitioner.id.startsWith('PA')
          ? `${result.practitioner.lastName.toUpperCase()}, ${result.practitioner.firstName}`
          : 'FERRETTI, Vincent',
        request: result.id,
        test: result.test,
        prescription: result.authoredOn,
        fetus: result.patientInfo.fetus,
      };

      Object.keys(value).forEach((key) => {
        if (value[key] == null || value[key].length === 0) {
          value[key] = '--';
        }
      });
      output.push(value);
    });
  }

  const columnPreset = [
    {
      key: 'selectKey',
      label: 'screen.patientsearch.table.select',
      renderer: createCellRenderer('custom', (() => output), {
        renderer: (data: any) => {
          const id: string = !data.request.includes('--') ? data.request : data.id;

          const getGender = () => {
            switch (data.gender) {
              case 'Homme' || 'Male':
                return 'male';
              case 'Femme' || 'Female':
                return 'female';
              default:
                return 'unknown';
            }
          };

          const patientInfo: PatientNanuqInformation = {
            type_echantillon: 'ADN',
            tissue_source: 'Sang',
            type_specimen: 'Normal',
            nom_patient: data.lastName,
            prenom_patient: data.firstName,
            patient_id: data.id,
            service_request_id: data.request,
            dossier_medical: data.mrn ? data.mrn : '--',
            institution: data.organization,
            DDN: moment(data.birthDate).format('DD/MM/yyyy'),
            sexe: getGender(),
            family_id: data.familyId,
            position: data.position,
            isActive: !!(data.status === 'active' || data.status === 'Approuvée'),
          };
          const isSelected = find(selectedPatients, { service_request_id: data.request });
          return (
            <Checkbox
              className="checkbox"
              id={id}
              onChange={() => {
                const oldSelectedPatients: PatientNanuqInformation[] = cloneDeep(selectedPatients);
                if (isSelected) {
                  if (id) {
                    const valueIndex = findIndex(oldSelectedPatients, { service_request_id: id });
                    oldSelectedPatients.splice(valueIndex, 1);
                    setselectedPatients([...oldSelectedPatients]);
                  }
                } else {
                  setselectedPatients([...oldSelectedPatients, patientInfo]);
                }
              }}
              checked={!!isSelected}
            />
          );
        },
      }),
      columnWidth: 50,
      headerRenderer: () => {
        const isAllSelected = results.length === selectedPatients.length;
        return (
          <HeaderCustomCell className="table__header__checkbox__wrapper">
            <Checkbox
              aria-label="Select All Variants"
              checked={isAllSelected}
              indeterminate={!isAllSelected && selectedPatients.length > 0}
              onChange={(e) => {
                const { checked } = e.target;
                if (checked) {
                  const newSelectedPatients = results.map((data: any) => (data.id));
                  setselectedPatients(newSelectedPatients);
                } else {
                  setselectedPatients([]);
                }
              }}
            />
          </HeaderCustomCell>
        );
      },
    },
    {
      key: 'status',
      label: 'screen.patientsearch.table.status',
      renderer: createCellRenderer('dot', () => output, {
        key: 'status',
        renderer: (value: any) => {
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
              return 'transparent';
          }
        },
      }),
    },
    {
      key: 'request',
      label: 'screen.patientsearch.table.id',
      renderer: createCellRenderer('custom', () => output, {
        renderer: (presetData: any) => (
          <Button
            onClick={() => handleGoToPatientScreen(presetData.id, presetData.request)}
            data-id={presetData.request}
            className="button link--underline"
          >
            { presetData.request }
          </Button>
        ),
      }),
    },
    {
      key: 'prescription',
      label: 'screen.patientsearch.table.prescription',
      renderer: createCellRenderer('text', (() => output), { key: 'prescription' }),
    },
    {
      key: 'test',
      label: 'screen.patientsearch.table.test',
      renderer: createCellRenderer('text', (() => output), { key: 'test' }),
    },
    {
      key: 'practitioner',
      label: 'screen.patientsearch.table.practitioner',
      renderer: createCellRenderer('text', (() => output), { key: 'practitioner' }),
    },
    {
      key: 'organization',
      label: 'screen.patientsearch.table.organization',
      renderer: createCellRenderer('text', (() => output), { key: 'organization' }),
    },
    {
      key: 'patientId',
      label: 'screen.patientsearch.table.patientId',
      renderer: createCellRenderer('custom', (() => output), {
        renderer: (data: any) => (
          <Button
            onClick={() => handleGoToPatientScreen(data.id)}
            data-id={data.request}
            className="button link--underline"
          >
            { data.id }
          </Button>
        ),
      }),
    },
    {
      key: 'ramq',
      label: 'screen.patientsearch.table.ramq',
      renderer: createCellRenderer('text', (() => output), { key: 'ramq' }),
    },
    {
      key: 'mrn',
      label: 'screen.patientsearch.table.mrn',
      renderer: createCellRenderer('text', (() => output), { key: 'mrn' }),
    },
  ];

  return (
    <div className="bp3-table-header">
      <div className="bp3-table-column-name">
        <InteractiveTable
          key="patient-interactive-table"
          size={size}
          page={page}
          isReorderable={false}
          isSelectable={false}
          total={autocompleteResults ? autocompleteResults.total : patient.total}
          totalLength={output.length}
          defaultVisibleColumns={defaultVisibleColumns}
          defaultColumnsOrder={defaultColumnsOrder}
          schema={columnPreset}
          pageChangeCallback={pageChangeCallback}
          pageSizeChangeCallback={pageSizeChangeCallback}
          numFrozenColumns={2}
          isLoading={isLoading}
          rowHeights={Array(patient.pageSize).fill(36)}
          columnsUpdated={columnsUpdated}
          columnsOrderUpdated={columnsOrderUpdated}
          columnsReset={columnsReset}
          enableRowHeader={false}
          isExportable={false}
          customHeader={(
            <PrescriptionTableHeader
              page={page}
              size={size}
              total={autocompleteResults ? autocompleteResults.total : patient.total}
              selectedPatients={selectedPatients}
            />
          )}
        />
      </div>
    </div>
  );
};

export default PrescriptionTable;
