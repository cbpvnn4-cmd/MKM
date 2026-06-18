describe('Authentication', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/login');
  });

  it('should display login form', () => {
    // Check that login form elements are present
    cy.get('[data-testid="login-form"]').should('be.visible');
    cy.get('[data-testid="username-input"]').should('be.visible');
    cy.get('[data-testid="password-input"]').should('be.visible');
    cy.get('[data-testid="login-button"]').should('be.visible');
  });

  it('should login with valid credentials', () => {
    // Intercept login request
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: {
        access_token: 'test-token',
        token_type: 'bearer'
      }
    }).as('loginRequest');

    // Fill in login form
    cy.get('[data-testid="username-input"]').type('testuser');
    cy.get('[data-testid="password-input"]').type('testpassword');
    
    // Submit form
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for login request to complete
    cy.wait('@loginRequest');
    
    // Check that we're redirected to dashboard
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="dashboard-title"]').should('be.visible');
  });

  it('should show error with invalid credentials', () => {
    // Intercept login request with error
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 401,
      body: {
        detail: 'Invalid credentials'
      }
    }).as('loginRequest');

    // Fill in login form with invalid credentials
    cy.get('[data-testid="username-input"]').type('invaliduser');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    
    // Submit form
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for login request to complete
    cy.wait('@loginRequest');
    
    // Check that error message is displayed
    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="error-message"]').should('contain.text', 'Invalid credentials');
  });
});