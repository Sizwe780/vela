"""Independent exact arithmetic checks for authored MAT1503 U6-U10.

No lesson parser, database, AI provider or source textbook is used. The worked
examples and numerical assessment/counterexample claims are independently
specified here, so this check supplements rather than replaces editorial review.
Changing lesson parameters requires updating this inventory and reviewing both.
"""
import sympy as S
M = S.Matrix
R = S.Rational
I = S.eye
Z = S.zeros
checks = []
covered = set()
def eq(tag, actual, expected):
    if isinstance(actual, S.MatrixBase):
        valid = actual.shape == expected.shape and all(S.simplify(v) == 0 for v in actual - expected)
    elif isinstance(actual, (tuple, list, set)):
        valid = actual == expected
    else:
        valid = S.simplify(actual - expected) == 0
    if not valid:
        raise AssertionError(f"{tag}: {actual!s} != {expected!s}")
    checks.append(tag)
    covered.add(tag.split(":")[0])
def truth(tag, condition):
    if not condition:
        raise AssertionError(tag)
    checks.append(tag)
    covered.add(tag.split(":")[0])
def replace_col(a, j, b):
    out = a.copy()
    out[:, j] = b
    return out

# U6: systems, exceptional cases and elementary-operation order.
a=M([[3,1],[2,1]]); inv=M([[1,-1],[-2,3]]); b=M([11,8]); x=M([3,2])
eq('U6S1:inverse', a.inv(), inv)
eq('U6S1:left-roundtrip', inv*a, I(2)); eq('U6S1:right-roundtrip', a*inv, I(2))
eq('U6S1:recovery', inv*b, x); eq('U6S1:substitution', a*x, b)
a=M([[2,1],[1,1]]); inv=M([[1,-1],[-1,2]]); b=M([[9,4],[5,3]]); x=M([[4,1],[1,2]])
eq('U6S2:inverse',a.inv(),inv);eq('U6S2:matrix-recovery',inv*b,x);eq('U6S2:all-columns-check',a*x,b)
eq('U6S2:second-column',a*M([1,2]),M([4,3]))
t=S.symbols('t', real=True); a=M([[2,6],[1,3]])
eq('U6S3:rank',a.rank(),1);eq('U6S3:kernel',a*M([-3,1]),Z(2,1))
eq('U6S3:solution-family',a*M([4-3*t,t]),M([8,4]));eq('U6S3:singularity',a.det(),0)
k=S.symbols('k', real=True);a=M([[1,2],[3,k]]);q=k-6
row=a.row(1)-3*a.row(0);eq('U6S4:last-row',row,M([[0,q]]))
eq('U6S4:first-generic-solution',a*M([5,0]),M([5,15]))
eq('U6S4:exceptional-family',a.subs(k,6)*M([5-2*t,t]),M([5,15]))
eq('U6S4:second-generic-solution',a*M([5-2/q,1/q]),M([5,16]))
eq('U6S4:exceptional-coefficient-rank',a.subs(k,6).rank(),1)
eq('U6S4:exceptional-contradiction',a.subs(k,6).row_join(M([5,16])).rank(),2)
a=M([[1,0],[0,1],[1,1]]);left=M([[1,0,0],[0,1,0]])
eq('U6S5:consistent-reading',a*M([4,7]),M([4,7,11]));eq('U6S5:full-column-rank',a.rank(),2)
eq('U6S5:left-inverse',left*a,I(2));eq('U6S5:opposite-product',a*left,M([[1,0,0],[0,1,0],[1,1,0]]))
truth('U6S5:not-two-sided',a*left!=I(3));eq('U6S5:inconsistent-reading-rank',a.row_join(M([4,7,12])).rank(),3)
a=M([[1,3],[0,2]]);e1=S.diag(1,R(1,2));e2=M([[1,-3],[0,1]])
eq('U6S6:scaled-array',e1*a,M([[1,3],[0,1]]));eq('U6S6:reduced-array',e2*e1*a,I(2))
eq('U6S6:inverse',a.inv(),M([[1,-R(3,2)],[0,R(1,2)]]));eq('U6S6:solution',a.inv()*M([13,6]),M([4,3]))
eq('U6S6:wrong-order-array',e1*e2,M([[1,-3],[0,R(1,2)]]));eq('U6S6:wrong-roundtrip-entry',(e1*e2*a)[0,1],-3)

# U7: matrix structure, transposition and inverse identities.
d=S.diag(3,-2,5);v=M([4,-1,2])
eq('U7S1:coordinate-output',d*v,M([12,2,10]));eq('U7S1:inverse',d.inv(),S.diag(R(1,3),-R(1,2),R(1,5)))
eq('U7S1:roundtrip',d.inv()*M([12,2,10]),v);eq('U7S1:lost-coordinate',S.diag(3,0,5)*M([0,1,0]),Z(3,1))
u=M([[2,3,-1],[0,-4,2],[0,0,5]]);x=M([1,3,2]);b=M([9,-8,10])
eq('U7S2:solution',u.inv()*b,x);eq('U7S2:all-rows',u*x,b)
eq('U7S2:free-coordinate-example',M([[0,1],[0,2]])*M([t,3]),M([3,6]))
s=M([[5,-2],[-2,7]]);v=M([[1,4],[4,0]])
eq('U7S3:first-symmetry',s.T,s);eq('U7S3:second-symmetry',v.T,v);eq('U7S3:sum',s+v,M([[6,2],[2,7]]))
d=S.diag(1,2);j=M([[0,1],[1,0]])
eq('U7S3:product-DJ',d*j,M([[0,1],[2,0]]));eq('U7S3:product-JD',j*d,M([[0,2],[1,0]]));truth('U7S3:noncommutation',d*j!=j*d)
a=M([[1,2],[0,3]]);b=M([[4,-1],[2,1]])
eq('U7S4:product',a*b,M([[8,1],[6,3]]));eq('U7S4:transpose', (a*b).T,M([[8,6],[1,3]]))
eq('U7S4:reversed-transpose',b.T*a.T,(a*b).T);eq('U7S4:wrong-transpose-order',a.T*b.T,M([[4,2],[5,7]]))
truth('U7S4:rectangular-dimensions',(M(S.MatrixSymbol('A',2,3)).T.shape,M(S.MatrixSymbol('B',3,4)).T.shape)==((3,2),(4,3)))
a=M([[1,2],[0,1]]);b=S.diag(3,2);p=a*b;inv=M([[R(1,3),-R(2,3)],[0,R(1,2)]])
eq('U7S5:product',p,M([[3,4],[0,2]]));eq('U7S5:inverse',p.inv(),inv);eq('U7S5:reverse-inverse-order',b.inv()*a.inv(),inv)
eq('U7S5:wrong-order',a.inv()*b.inv(),M([[R(1,3),-1],[0,R(1,2)]]));eq('U7S5:verified-product',p*inv,I(2));truth('U7S5:wrong-product-fails',p*a.inv()*b.inv()!=I(2))
a=M([[2,7],[-1,6]]);h=M([[2,3],[3,6]]);kmat=M([[0,4],[-4,0]])
eq('U7S6:symmetric-part',(a+a.T)/2,h);eq('U7S6:skew-part',(a-a.T)/2,kmat)
eq('U7S6:reconstruction',h+kmat,a);eq('U7S6:symmetry',h.T,h);eq('U7S6:skew-symmetry',kmat.T,-kmat)
eq('U7S6:inverse-counterexample',kmat.inv(),M([[0,-R(1,4)],[R(1,4),0]]));eq('U7S6:inverse-product',kmat*kmat.inv(),I(2))

# U8: minors, signs, expansions and parameter families.
a=M([[4,1],[2,3]])
eq('U8S1:determinant',a.det(),10);eq('U8S1:column-swap',a[:,[1,0]].det(),-10)
vertices=[(0,0),(4,2),(5,5),(1,3)]
area=S.Rational(sum(vertices[i][0]*vertices[(i+1)%4][1]-vertices[(i+1)%4][0]*vertices[i][1] for i in range(4)),2)
eq('U8S1:independent-shoelace-area',area,10)
a=M([[2,1,3],[0,-2,4],[5,0,1]])
eq('U8S2:minor12',a.minor(0,1),-20);eq('U8S2:cofactor12',a.cofactor(0,1),20)
eq('U8S2:minor23',a.minor(1,2),-5);eq('U8S2:cofactor23',a.cofactor(1,2),5);eq('U8S2:cofactor31',a.cofactor(2,0),10)
eq('U8S2:retained-array31',a.minor_submatrix(2,0),M([[1,3],[-2,4]]))
a=M([[1,0,2],[0,3,0],[4,1,5]])
eq('U8S3:minor22',a.minor(1,1),-3);eq('U8S3:determinant',a.det(),-9)
eq('U8S3:row-one-contributions',[a[0,j]*a.cofactor(0,j) for j in range(3)],[15,0,-24])
a=M([[3,0,1],[2,4,-1],[0,5,2]])
eq('U8S4:determinant',a.det(),49);eq('U8S4:first-column-contributions',[a[i,0]*a.cofactor(i,0) for i in range(3)],[39,10,0])
eq('U8S4:first-minor',a.minor(0,0),13);eq('U8S4:second-minor',a.minor(1,0),-5)
eq('U8S4:third-row-contributions',[a[2,j]*a.cofactor(2,j) for j in range(3)],[0,25,24])
p=S.symbols('p', real=True);a=M([[p,1,0],[2,3,0],[1,-1,4]])
eq('U8S5:determinant-polynomial',a.det(),4*(3*p-2));eq('U8S5:exceptional-values',set(S.solve(a.det(),p)),{R(2,3)})
eq('U8S5:kernel-at-exception',a.subs(p,R(2,3))*M([12,-8,-5]),Z(3,1));eq('U8S5:nonexceptional-check',a.subs(p,2).det(),16)
a=M([[1,2,3],[2,4,6],[0,1,1]])
eq('U8S6:rank',a.rank(),2);eq('U8S6:determinant',a.det(),0);eq('U8S6:dependent-row',a.row(1),2*a.row(0))
eq('U8S6:kernel',a*M([-1,-1,1]),Z(3,1));eq('U8S6:affine-solutions',a*M([2-t,2-t,t]),M([6,12,2]))
eq('U8S6:inconsistent-rank',a.row_join(M([6,13,2])).rank(),3)

# U9: each row operation and its determinant ledger.
a=M([[0,2,1],[3,1,0],[1,-1,2]]);b=a.copy();b.row_swap(0,1)
eq('U9S1:original-det',a.det(),-16);eq('U9S1:swapped-det',b.det(),16)
b[2,:]=b.row(2)-R(1,3)*b.row(0);eq('U9S1:first-replacement',b.row(2),M([[0,-R(4,3),2]]))
b[2,:]=b.row(2)+R(2,3)*b.row(1);eq('U9S1:triangular-diagonal',[b[i,i] for i in range(3)],[3,2,R(8,3)]);eq('U9S1:triangular-det',b.det(),16)
a=M([[2,1],[5,4]]);eq('U9S2:original-det',a.det(),3)
b=a.copy();b[0,:]=7*b.row(0);eq('U9S2:single-row-scaled',b.det(),21)
b=a.copy();b[0,:]=b.row(0)/2;eq('U9S2:single-row-halved',b.det(),R(3,2));eq('U9S2:all-rows-scaled',(2*a).det(),12)
a=M([[1,4,2],[2,9,1],[3,5,6]]);b=a.copy()
eq('U9S3:original-det',a.det(),-21)
b[1,:]=b.row(1)-2*b.row(0);b[2,:]=b.row(2)-3*b.row(0)
eq('U9S3:first-reduced-row',b.row(1),M([[0,1,-3]]));eq('U9S3:second-reduced-row',b.row(2),M([[0,-7,0]]))
b[2,:]=b.row(2)+7*b.row(1);eq('U9S3:triangular-diagonal',[b[i,i] for i in range(3)],[1,1,-21]);eq('U9S3:preserved-det',b.det(),-21)
b=a.copy();b[2,:]=a.row(0)+a.row(1);eq('U9S3:non-preserving-overwrite',b.det(),0)
a=M([[2,1,3],[4,3,7],[0,2,5]]);b=a.copy();eq('U9S4:original-det',a.det(),6)
b[1,:]=b.row(1)-2*b.row(0);eq('U9S4:first-replacement',b.row(1),M([[0,1,1]]));b[2,:]=b.row(2)-2*b.row(1)
eq('U9S4:last-replacement',b.row(2),M([[0,0,3]]));eq('U9S4:preserved-det',b.det(),6);eq('U9S4:wrong-original-diagonal',S.prod(a[i,i] for i in range(3)),30)
eq('U9S4:lower-triangular-example',M([[3,0,0],[2,-1,0],[4,5,2]]).det(),-6)
a=M([[3,1,2],[2,4,1],[1,-1,5]]);b=a.copy();eq('U9S5:original-det',a.det(),42)
b[1,:]=b.row(1)-R(2,3)*b.row(0);b[2,:]=b.row(2)-R(1,3)*b.row(0)
eq('U9S5:fractional-row-two',b.row(1),M([[0,R(10,3),-R(1,3)]]));eq('U9S5:fractional-row-three',b.row(2),M([[0,-R(4,3),R(13,3)]]))
b[2,:]=b.row(2)+R(2,5)*b.row(1);eq('U9S5:final-diagonal',[b[i,i] for i in range(3)],[3,R(10,3),R(21,5)]);eq('U9S5:triangular-product',S.prod(b[i,i] for i in range(3)),42)
b=a.copy();b[1,:]=3*b.row(1)-2*b.row(0);eq('U9S5:combined-operation-scale',b.det(),126)
a=M([[1,2,-1],[2,5,1],[3,7,0]])
eq('U9S6:row-dependence',a.row(2),a.row(0)+a.row(1));eq('U9S6:rank',a.rank(),2);eq('U9S6:determinant',a.det(),0)
b=a.copy();b[1,:]=b.row(1)-2*b.row(0);b[2,:]=b.row(2)-3*b.row(0)
eq('U9S6:duplicate-reduced-row',b.row(1),M([[0,1,3]]));eq('U9S6:equal-reduced-rows',b.row(2),b.row(1));eq('U9S6:kernel',a*M([7,-3,1]),Z(3,1))
eps=S.symbols('epsilon',real=True);b=a.copy();b[2,2]=eps;eq('U9S6:exact-perturbation',b.det(),eps)

# U10: product rules, adjugates and every Cramer numerator.
a=M([[2,1],[0,3]]);b=M([[1,0],[4,2]])
eq('U10S1:first-det',a.det(),6);eq('U10S1:second-det',b.det(),2);eq('U10S1:product-matrix',a*b,M([[6,2],[12,6]]))
eq('U10S1:product-det',(a*b).det(),12);eq('U10S1:sum-matrix',a+b,M([[3,1],[4,5]]));eq('U10S1:sum-det',(a+b).det(),11);eq('U10S1:sum-of-dets',a.det()+b.det(),8)
a=M([[1,3,0],[2,-1,4],[0,2,5]])
eq('U10S2:original-det',a.det(),-43);eq('U10S2:transpose-det',a.T.det(),-43)
b=a.copy();b.row_swap(0,1);eq('U10S2:row-exchange-det',b.det(),43)
b=a.copy();b.col_swap(0,1);eq('U10S2:column-exchange-det',b.det(),43)
eq('U10S2:first-row-minor',a.minor(0,0),-13);eq('U10S2:second-row-minor',a.minor(0,1),10)
a=M([[5,2],[1,1]])
eq('U10S3:original-det',a.det(),3);eq('U10S3:inverse-array',a.inv(),M([[R(1,3),-R(2,3)],[-R(1,3),R(5,3)]]))
eq('U10S3:inverse-det',a.inv().det(),R(1,3));eq('U10S3:positive-uniform-scale',(3*a).det(),27);eq('U10S3:negative-even-scale',(-2*a).det(),12);eq('U10S3:negative-odd-scale',(-2*I(3)).det(),-8)
a=M([[2,3],[1,4]]);co=M([[4,-1],[-3,2]]);adj=M([[4,-3],[-1,2]])
eq('U10S4:determinant',a.det(),5);eq('U10S4:cofactor-array',a.cofactor_matrix(),co);eq('U10S4:adjugate',a.adjugate(),adj)
eq('U10S4:left-identity',a*adj,5*I(2));eq('U10S4:right-identity',adj*a,5*I(2));eq('U10S4:inverse-formula',adj/5,a.inv())
b=M([[1,2],[2,4]]);badj=M([[4,-2],[-2,1]])
eq('U10S4:singular-det',b.det(),0);eq('U10S4:nonzero-singular-adjugate',b.adjugate(),badj);truth('U10S4:adjugate-is-not-zero',badj!=Z(2));eq('U10S4:singular-product',b*badj,Z(2))
a=M([[3,2],[1,-1]]);b=M([17,4]);eq('U10S5:denominator',a.det(),-5)
eq('U10S5:first-numerator',replace_col(a,0,b).det(),-25);eq('U10S5:second-numerator',replace_col(a,1,b).det(),-5)
eq('U10S5:solution',a.inv()*b,M([5,1]));eq('U10S5:substitution',a*M([5,1]),b)
T=S.symbols('T',real=True);prices=M([(T+8)/5,(T-12)/5])
eq('U10S5:transfer-parameter-prices',a.inv()*M([T,4]),prices)
eq('U10S5:transfer-parameter-substitution',a*prices,M([T,4]))
nonnegative=S.solve_univariate_inequality(prices[0]>=0,T,relational=False).intersect(S.solve_univariate_inequality(prices[1]>=0,T,relational=False))
positive=S.solve_univariate_inequality(prices[0]>0,T,relational=False).intersect(S.solve_univariate_inequality(prices[1]>0,T,relational=False))
truth('U10S5:nonnegative-price-feasibility',nonnegative==S.Interval(12,S.oo))
truth('U10S5:positive-price-feasibility',positive==S.Interval.open(12,S.oo))
eq('U10S5:admissible-boundary',prices.subs(T,12),M([4,0]))
a=M([[2,0,1],[1,3,0],[0,1,2]]);b=M([7,-1,5]);adj=M([[6,1,-3],[-2,4,1],[1,-2,6]])
eq('U10S6:denominator',a.det(),13);eq('U10S6:replacement-determinants',[replace_col(a,j,b).det() for j in range(3)],[26,-13,39])
eq('U10S6:recovered-coordinates',a.inv()*b,M([2,-1,3]));eq('U10S6:substitution',a*M([2,-1,3]),b)
eq('U10S6:adjugate-array',a.adjugate(),adj);eq('U10S6:adjugate-left-identity',a*adj,13*I(3));eq('U10S6:adjugate-right-identity',adj*a,13*I(3))
expected={f'U{u}S{s}' for u in range(6,11) for s in range(1,7)}
if covered != expected:
    raise AssertionError(f'Missing session coverage: {expected-covered}')
print(f'{len(checks)} independent exact checks passed across {len(covered)} sessions (MAT1503 U6-U10).')
