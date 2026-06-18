// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom commands
Cypress.Commands.add('login', (username, password) => {
  cy.visit('/login');
  cy.get('[data-testid="username-input"]').type(username);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
});

Cypress.Commands.add('createPartner', (partnerData) => {
  cy.visit('/partners');
  cy.get('[data-testid="add-partner-button"]').click();
  cy.get('[data-testid="partner-name-input"]').type(partnerData.name);
  cy.get('[data-testid="partner-national-id-input"]').type(partnerData.national_id);
  cy.get('[data-testid="partner-phone-input"]').type(partnerData.phone);
  cy.get('[data-testid="partner-email-input"]').type(partnerData.email);
  cy.get('[data-testid="save-partner-button"]').click();
});

// Global before each hook
beforeEach(() => {
  // Reset database or mock API calls
  cy.intercept('GET', '/api/partners', { fixture: 'partners.json' }).as('getPartners');
  cy.intercept('POST', '/api/partners', { fixture: 'partner.json' }).as('createPartner');
});

// Global after each hook
afterEach(() => {
  // Clean up after each test
  cy.log('Test completed');
});