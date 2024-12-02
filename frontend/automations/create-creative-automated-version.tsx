import * as React from "react";
import { Fragment, useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useBase, useCursor, useLoadable, useRecords, useWatchable } from "@airtable/blocks/ui";
import Grid from "@mui/material/Grid2";
import { JsonForms } from '@jsonforms/react';
import { materialCells } from '@jsonforms/material-renderers';

import SelectedCreatives from "../selected-creatives";
import { Automation } from "../types";
import runAutomation from "../run-automation";
import AutomationStatusList from "../automation-status-list";
import renderers from "../custom-ui/renderers";

const initialData = {};

const uiSchema = {
  type: "VerticalLayout",
  elements: [
    {
      type: "Control",
      label: "Version type",
      scope: "#/properties/type",
      options: {
        format: "radio",
      },
    },
    {
      type: "Control",
      label: "Initials of the Creative Marketing Specialist",
      scope: "#/properties/createdBy",
    },
    {
      type: "Control",
      label: "Number of technical tasks",
      scope: "#/properties/count",
      rule: {
        effect: "HIDE",
        condition: {
          scope: "#/properties/type",
          schema: {
            enum: ["medium", "format"],
          },
        },
      },
    },
    {
      type: "Control",
      label: "Headline",
      scope: "#/properties/headline",
      rule: {
        effect: "SHOW",
        condition: {
          scope: "#/properties/type",
          schema: {
            enum: ["medium"],
          },
        },
      },
    },
    {
      type: "Control",
      label: "Visual",
      scope: "#/properties/visual",
      rule: {
        effect: "SHOW",
        condition: {
          scope: "#/properties/type",
          schema: {
            enum: ["medium"],
          },
        },
      },
    },
    {
      type: "VerticalLayout",
      elements: [
        {
          type: "Control",
          scope: "#/properties/blocks",
          options: {
            format: "block",
          },
        },
      ],
      rule: {
        effect: "SHOW",
        condition: {
          scope: "#/properties/type",
          schema: {
            enum: ["format"],
          },
        },
      },
    },
  ],
};

export default function CreateCreativeAutomatedVersion() {
  const cursor = useCursor();
  // load selected records and fields
  useLoadable(cursor);

  // re-render whenever the list of selected records
  useWatchable(cursor, ["selectedRecordIds"]);
  const base = useBase();
  const view = base.getTableById(cursor.activeTableId).getViewById(cursor.activeViewId);

  const [data, setData] = useState<object>(initialData);
  const [errors, setErrors] = useState<object[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);

  // TODO: fix typing
  const assigneeField: any = base.tables.find((t) => t.name === 'Creative process').fields.find((f) => f.name === 'Created By');
  const blockTable = base.tables.find((t) => t.name === 'Blocks');
  const blockField: any = blockTable.fields.find((f) => f.name === 'Block');
  const attributeField: any = blockTable.fields.find((f) => f.name === 'Attribute');
  const categoryField: any = blockTable.fields.find((f) => f.name === 'Category');
  const blockRecords: any[] = useRecords(blockTable);

  const schema = {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": ['simple', 'medium', 'radical', 'format'],
      },
      "createdBy": {
        "type": "string",
        "enum": assigneeField.config.options.choices.map((choice) => choice.name),
      },
      "count": {
        "type": "integer",
        "maximum": 100
      },
      "headline": {
        "type": "string"
      },
      "visual": {
        "type": "integer",
        "maximum": 100
      },
      "blocks": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "enum": ['Visual'],
            },
            "attribute": {
              "type": "string",
              "enum": ['Format'],
            },
            "category": {
              "type": "string",
              "enum": [...new Set(categoryField.config.options.choices.map((choice) => choice.name))].sort(),
            },
            "parameter": {
              "type": "string",
              "enum": [...new Set(blockRecords.map((choice) => choice.getCellValue('Parameter')))].sort(),
            }
          },
          "required": ['name', 'attribute', 'category', 'parameter']
        }
      }
    }
  };

  const onClick = async () => runAutomation<object>('/creative/create-version', cursor.selectedRecordIds, data, setAutomations);
  const onChange = (formState) => {
    setData(formState.data);
    setErrors(formState.errors);
  };

  return (
    <Fragment>
      <SelectedCreatives />
      <Grid container spacing={2}>
        <Grid size={12}>
          <JsonForms
            schema={schema}
            uischema={uiSchema}
            data={data}
            renderers={renderers}
            cells={materialCells}
            onChange={onChange}
          />
        </Grid>
        <Grid size={12}>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" disabled={!cursor?.selectedRecordIds?.length || Boolean(errors.length)} onClick={onClick}>
              Create versions
            </Button>
          </Stack>
        </Grid>
        <Grid size={12}>
          <AutomationStatusList view={view} automationsStats={automations} />
        </Grid>
      </Grid>
    </Fragment>
  );
}
