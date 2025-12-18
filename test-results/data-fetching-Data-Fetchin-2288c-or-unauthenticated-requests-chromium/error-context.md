# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - heading "Maria Havens" [level=1] [ref=e10]
    - paragraph [ref=e11]: Point of Sale System
  - generic [ref=e12]:
    - heading "Staff Login" [level=2] [ref=e13]
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: Username
        - generic [ref=e17]:
          - img [ref=e18]
          - textbox "Username" [ref=e21]:
            - /placeholder: Enter your username
      - generic [ref=e22]:
        - generic [ref=e23]: Password
        - generic [ref=e24]:
          - img [ref=e25]
          - textbox "Password" [ref=e28]:
            - /placeholder: Enter your password
          - button [ref=e29] [cursor=pointer]:
            - img [ref=e30]
      - button "Login" [disabled] [ref=e33]
      - button "Forgot Password?" [ref=e35] [cursor=pointer]:
        - img [ref=e36]
        - text: Forgot Password?
    - generic [ref=e39]:
      - generic [ref=e44]: or
      - button "Quick POS Access" [ref=e45] [cursor=pointer]:
        - img [ref=e46]
        - text: Quick POS Access
      - paragraph [ref=e51]: Direct access for waiters - PIN required for orders
```