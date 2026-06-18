describe('Partner Management', () => {
  beforeEach(() => {
    // Login before each test
    cy.login('testuser', 'testpassword');
    
    // Visit partners page
    cy.visit('/partners');
  });

  it('should display partners list', () => {
    // Check that partners list is displayed
    cy.get('[data-testid="partners-list"]').should('be.visible');
    cy.get('[data-testid="partner-row"]').should('have.length.greaterThan', 0);
  });

  it('should create a new partner', () => {
    // Intercept create partner request
    cy.intercept('POST', '/api/partners', {
      statusCode: 201,
      body: {
        id: 3,
        name: 'New Test Partner',
        national_id: '111222333',
        phone: '+1112223333',
        email: 'newpartner@example.com',
        active: true,
        created_at: '2025-01-15T10:00:00Z'
      }
    }).as('createPartner');

    // Click add partner button
    cy.get('[data-testid="add-partner-button"]').click();
    
    // Fill in partner form
    cy.get('[data-testid="partner-name-input"]').type('New Test Partner');
    cy.get('[data-testid="partner-national-id-input"]').type('111222333');
    cy.get('[data-testid="partner-phone-input"]').type('+1112223333');
    cy.get('[data-testid="partner-email-input"]').type('newpartner@example.com');
    
    // Submit form
    cy.get('[data-testid="save-partner-button"]').click();
    
    // Wait for create request to complete
    cy.wait('@createPartner');
    
    // Check that we're back to partners list
    cy.get('[data-testid="partners-list"]').should('be.visible');
    
    // Check that new partner appears in the list
    cy.contains('New Test Partner').should('be.visible');
  });

  it('should edit an existing partner', () => {
    // Intercept update partner request
    cy.intercept('PUT', '/api/partners/1', {
      statusCode: 200,
      body: {
        id: 1,
        name: 'Updated Partner',
        national_id: '123456789',
        phone: '+9998887777',
        email: 'updated@example.com',
        active: true,
        created_at: '2025-01-01T10:00:00Z'
      }
    }).as('updatePartner');

    // Click edit button for first partner
    cy.get('[data-testid="partner-row"]').first().within(() => {
      cy.get('[data-testid="edit-partner-button"]').click();
    });
    
    // Update partner form
    cy.get('[data-testid="partner-phone-input"]').clear().type('+9998887777');
    cy.get('[data-testid="partner-email-input"]').clear().type('updated@example.com');
    
    // Submit form
    cy.get('[data-testid="save-partner-button"]').click();
    
    // Wait for update request to complete
    cy.wait('@updatePartner');
    
    // Check that we're back to partners list
    cy.get('[data-testid="partners-list"]').should('be.visible');
    
    // Check that updated partner appears in the list
    cy.contains('updated@example.com').should('be.visible');
  });

  it('should delete a partner', () => {
    // Intercept delete partner request
    cy.intercept('DELETE', '/api/partners/1', {
      statusCode: 204
    }).as('deletePartner');

    // Click delete button for first partner
    cy.get('[data-testid="partner-row"]').first().within(() => {
      cy.get('[data-testid="delete-partner-button"]').click();
    });
    
    // Confirm deletion
    cy.get('[data-testid="confirm-delete-button"]').click();
    
    // Wait for delete request to complete
    cy.wait('@deletePartner');
    
    // Check that partner is removed from the list
    cy.contains('Test Partner 1').should('not.exist');
  });
});