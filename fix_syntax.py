with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

bad = """          <Plus className="w-5 h-5" />
          ثبت قرارداد اجاره جدید
        </button>
        </div>
      </div>"""
      
good = """          <Plus className="w-5 h-5" />
          ثبت قرارداد اجاره جدید
        </button>
      </div>"""

code = code.replace(bad, good)
with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
