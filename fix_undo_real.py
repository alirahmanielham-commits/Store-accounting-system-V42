with open('src/components/payroll/EmployeeOrdersManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I want to replace
#       )}
#       </div>
#     </div>
#     );
#   }
# 
#   if (isModalOpen) {

bad_block = '''      )}
      </div>
    </div>
    );
  }

  if (isModalOpen) {'''

good_block = '''      )}
      </div>
    </div>
    );
  }

  if (isModalOpen) {'''

# Wait, if I delete a div, how many are there?
# At 218: <div className="min-h-full ...">
# At 219: <div className="max-w-5xl ...">
# Let's count them!

