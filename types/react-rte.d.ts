declare module "react-rte" {
    import * as React from "react";
  
    interface Props {
      value: any;
      onChange: (value: any) => void;
      toolbarConfig?: any;
      className?: string;
    }
  
    export default class RichTextEditor extends React.Component<Props> {
      static createValueFromString(content: string, format: string): any;
    }
  }
  