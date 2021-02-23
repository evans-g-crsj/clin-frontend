import { CloseOutlined } from '@ant-design/icons';
import get from 'lodash/get';
import {
  Select, Row, Col, Button, Input, Form,
} from 'antd';
import { FormInstance } from 'antd/lib/form';
import intl from 'react-intl-universal';
import React, { useState } from 'react';
import { Identifier, Patient } from '../../../../../../helpers/fhir/types';
import style from '../../../../../../containers/App/style.module.scss';

const getOrganizationName = (identifier: Identifier) => identifier.assigner!.reference.split('/')[1];

enum Mode {
  SELECT, CREATION
}

interface Props {
  patient: Patient;
  form: FormInstance;
  onChange: () => void
}

const MrnItem: React.FC<Props> = ({ form, patient, onChange }) => {
  const [mode, setMode] = useState<Mode>(Mode.SELECT);
  const [defaultSelectedMrn, setDefaultSelctedMrn] = useState<Identifier | undefined>(
    patient.identifier.find((id) => get(id, 'type.coding[0].code') === 'MR'),
  );

  const onCreationMode = () => {
    setMode(Mode.CREATION);
    setDefaultSelctedMrn(undefined);
  };

  React.useEffect(() => {
    if (defaultSelectedMrn != null) {
      form.setFieldsValue({
        organization: getOrganizationName(defaultSelectedMrn),
        mrn: defaultSelectedMrn.value,
      });
    } else {
      form.setFieldsValue({
        organization: null,
        mrn: null,
      });
    }
    onChange();
  }, [defaultSelectedMrn]);

  if (mode === Mode.CREATION) {
    return (
      <Row gutter={8}>
        <Col>
          <Form.Item name="mrn">
            <Input aria-label="mrn" />
          </Form.Item>
        </Col>
        <Col>
          <Form.Item
            name="organization"
          >
            <Select
              style={{ width: 120 }}
              onChange={(value) => {
                form.setFieldsValue({ organization: value.toString() });
                onChange();
              }}
            >
              <Select.Option value="CHUSJ">CHUSJ</Select.Option>
              <Select.Option value="CHUM">CHUM</Select.Option>
              <Select.Option value="CUSM">CUSM</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col>
          <Button type="primary">
            { intl.get('form.patientSubmission.clinicalInformation.file.add') }
          </Button>
        </Col>
        <Col>
          <Button
            aria-label="Cancel"
            icon={<CloseOutlined />}
            className={[style.btn, style.btnSecondary].join(' ')}
            onClick={() => {
              setMode(Mode.SELECT);
              setDefaultSelctedMrn(undefined);
            }}
          />
        </Col>
      </Row>
    );
  }

  const getMrnValue = (identifier: Identifier | undefined) : string | undefined => {
    if (identifier == null) {
      return undefined;
    }
    return `${identifier.value}|${identifier.assigner!.reference.split('/')[1]}`;
  };

  const getLabel = (id: Identifier) => `${id.value} | ${id.assigner!.reference.split('/')[1]}`;

  return (
    <>
      <Form.Item
        noStyle
        name="mrn"
        initialValue={getMrnValue(patient.identifier[0])?.split('|')[0]}
      >
        <Input hidden />
      </Form.Item>
      <Form.Item
        noStyle
        name="organization"
        initialValue={getMrnValue(patient.identifier[0])?.split('|')[1]}
      >
        <Input hidden />
      </Form.Item>
      <Select
        className="clinical-information__mrn"
        onChange={(value: string) => {
          const [mrn, organization] = value.split('|');
          form.setFields([
            { name: 'mrn', value: mrn },
            { name: 'organization', value: organization },
          ]);
          onChange();
        }}
        dropdownRender={(menu) => (
          <div>
            { menu }
            <Button
              className="clinical-information__mrn__create-button"
              onClick={() => onCreationMode()}
            >
              { intl.get('form.patientSubmission.clinicalInformation.file.addFile') }
            </Button>
          </div>
        )}
        defaultValue={getMrnValue(defaultSelectedMrn)}
      >
        {
          patient.identifier
            .filter((id) => id.type.coding && id.type.coding[0].code === 'MR')
            .map((id) => (
              <Select.Option
                key={getLabel(id)}
                value={getMrnValue(id)!}
                className="clinical-information__mrn-options"
              >
                { getLabel(id) }
              </Select.Option>
            ))
        }
      </Select>
    </>
  );
};

export default MrnItem;
