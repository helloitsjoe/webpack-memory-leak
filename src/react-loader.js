module.exports.pitch = function reactLoader() {
  this.cacheable();

  return `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server.node';
import Component from '${this.remainingRequest}';

export default function render() {
  return renderToStaticMarkup(React.createElement(Component));
}
  `;
};
