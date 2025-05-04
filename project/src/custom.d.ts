declare module 'react-apexcharts' {
  import { Component } from 'react';
  
  export interface ApexChartProps {
    type?: 'line' | 'area' | 'bar' | 'histogram' | 'pie' | 'donut' | 'radialBar' | 'scatter' | 'bubble' | 'heatmap' | 'candlestick' | 'radar' | 'polarArea';
    series: any;
    width?: string | number;
    height?: string | number;
    options?: any;
    [key: string]: any;
  }
  
  class ApexCharts extends Component<ApexChartProps> {}
  
  export default ApexCharts;
} 