// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to login
Cypress.Commands.add('login', (username, password) => {
  cy.request('POST', `${Cypress.env('API_BASE_URL')}/auth/login`, {
    username,
    password
  }).then((response) => {
    window.localStorage.setItem('access_token', response.body.access_token);
  });
});

// Custom command to create a partner
Cypress.Commands.add('createPartner', (partnerData) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_BASE_URL')}/partners`,
    body: partnerData,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('access_token')}`
    }
  });
});

// Custom command to create a customer
Cypress.Commands.add('createCustomer', (customerData) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_BASE_URL')}/customers`,
    body: customerData,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('access_token')}`
    }
  });
});

// Custom command to create a project
Cypress.Commands.add('createProject', (projectData) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_BASE_URL')}/projects`,
    body: projectData,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('access_token')}`
    }
  });
});