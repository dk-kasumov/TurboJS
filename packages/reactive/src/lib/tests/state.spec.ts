import { $state } from '../state';

describe('Reactive State', () => {
  it('Should work', () => {
    expect($state('Davyd')).toHaveBeenCalled()
  });
});
