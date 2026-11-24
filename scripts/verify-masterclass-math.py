"""Independent exact checks for authored MAT1512 masterclass examples.
This checks stated symbolic/numerical claims, not every pedagogical sentence.
"""
from pathlib import Path
import runpy
import sympy as s
baseline = runpy.run_path(str(Path(__file__).with_name("verify-session-math.py")))
x,t,h=s.symbols("x t h", real=True)
checks={
 "radical conjugate limit": s.limit((s.sqrt(25+3*x)-5)/x,x,0)==s.Rational(3,10),
 "IVT endpoint signs": (x**3+2*x-11).subs(x,1)==-8 and (x**3+2*x-11).subs(x,2)==1,
 "IVT bisection": (x**3+2*x-11).subs(x,s.Rational(3,2))==-s.Rational(37,8),
 "square first principles": s.simplify(((x+h)**2-x**2)/h-(2*x+h))==0,
 "linearised sqrt": s.diff(s.sqrt(x),x).subs(x,81)==s.Rational(1,18) and 9+s.Rational(1,18)==s.Rational(163,18),
 "second quotient route": s.simplify((x*x+11)/(x-3)-(x+3+20/(x-3)))==0,
 "quotient slope diagnostic": s.diff((x*x+11)/(x-3),x).subs(x,4)==-19,
 "quotient transfer": s.simplify(s.diff((x*x+18)/(x-4),x)-(1-34/(x-4)**2))==0,
 "chain cosine": s.diff(s.cos(7*x-4),x)==-7*s.sin(7*x-4),
 "inverse sine chain": s.simplify(s.diff(s.asin(x/5),x)-1/s.sqrt(25-x*x))==0,
 "inverse rate at16": (x**3+4*x).subs(x,2)==16 and s.diff(x**3+4*x,x).subs(x,2)==16,
 "inverse rate transfer": (2*x**3+5*x).subs(x,1)==7 and s.diff(2*x**3+5*x,x).subs(x,1)==11,
 "second ellipse point": 6**2+2*3**2==54 and -s.Rational(6,2*3)==-1,
 "logarithmic product derivative": s.simplify(s.diff(x**3*s.sqrt(x*x+6),x)-x*x*(4*x*x+18)/s.sqrt(x*x+6))==0,
 "logarithmic derivative value": s.diff(x**3*s.sqrt(x*x+6),x).subs(x,1)==22/s.sqrt(7),
 "product transfer": s.simplify(s.diff(x*x*s.sqrt(x*x+10),x)-x*(3*x*x+20)/s.sqrt(x*x+10))==0,
 "bounded quadratic extrema": [(x*x-8*x+7).subs(x,k) for k in [1,4,6]]==[0,-9,-5],
 "modified three-side garden": s.diff(x*(100-2*x),x).subs(x,25)==0 and 25*(100-50)==1250,
 "second rational division": s.simplify((x*x+16)/(x-3)-(x+3+25/(x-3)))==0,
 "MVT original point": s.diff(x*x+3*x,x).subs(x,s.Rational(5,2))==8,
 "MVT transfer point": s.diff(x*x+5*x,x).subs(x,4)==13 and ((6**2+5*6)-(2**2+5*2))/4==13,
 "box derivative": s.expand(s.diff(x*(30-2*x)*(18-2*x),x)-12*(x*x-16*x+45))==0,
 "box critical roots": set(s.solve(s.diff(x*(30-2*x)*(18-2*x),x),x))=={8-s.sqrt(19),8+s.sqrt(19)},
 "box feasible root": 0<float(8-s.sqrt(19))<9<float(8+s.sqrt(19)),
 "box sample volume": 3*(30-6)*(18-6)==864,
 "log product limit": s.limit(x*s.log(x),x,0,dir="+")==0,
 "squared log product limit": s.limit(x*x*s.log(x),x,0,dir="+")==0,
 "right sum n8": 32+s.Rational(24,8)==35,
 "rate transfer integral": s.integrate(2*t+5,(t,0,3))==24,
 "variable endpoint transfer": s.diff(s.integrate(t*t+4,(t,2,3*x)),x)==27*x*x+12,
 "half substitution": s.integrate(3*x*(3*x*x+7)**2,(x,0,2))==1086,
 "trig antiderivative transfer": s.diff(s.sin(7*x+4)/7,x)==s.cos(7*x+4),
 "reversal position": (t*t-7*t+11).subs(t,s.Rational(7,2))==-s.Rational(5,4),
 "sine definite integral": s.integrate(s.sin(3*x),(x,0,s.pi/6))==s.Rational(1,3),
 "exponential definite integral": s.integrate(5*s.exp(5*x+2),(x,0,1))==s.exp(7)-s.exp(2),
 "sine transfer integral": s.integrate(s.sin(4*x),(x,0,s.pi/8))==s.Rational(1,4),
 "logarithmic primitive transfer": s.simplify(s.diff(s.log(3*x*x+17),x)-6*x/(3*x*x+17))==0,
 "area between curves": s.integrate(4*x-x*x,(x,0,4))==s.Rational(32,3),
 "average value original": s.integrate(x*x+2,(x,1,4))/3==9,
 "average value transfer": s.integrate(x*x,(x,0,3))/3==3,
}
failed=[name for name,ok in checks.items() if not ok]
assert not failed, failed
print(f"{len(checks)} additional independent exact masterclass checks passed")
print(f"{len(checks)+len(baseline['checks'])} total exact checks passed")
